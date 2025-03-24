import type {
    ConfigureFileParams,
    UpdateSnapshotParams,
    GetClientConfigParams,
    GetClientConfigResult
} from "../../../types/communication"
import type { RealPath } from "../../../types/common"
import type { CachedCompileResultItem } from "./types/service"
import type { PositionFlagKeys, TemplateNode } from "qingkuai/compiler"

import {
    tpic,
    setState,
    connection,
    isTestingEnv,
    typeRefStatement,
    tpicConnectedPromise,
    tpicConnectedResolver,
    limitedScriptLanguageFeatures
} from "./state"
import {
    compressItos,
    isIndexesInvalid,
    compressPosition,
    getScriptKindKey,
    compressPositionFlags
} from "../../../shared-util/qingkuai"
import {
    LSHandler,
    TPICHandler,
    JS_TYPE_DECLARATION_LEN,
    TS_TYPE_DECLARATION_LEN
} from "../../../shared-util/constant"
import { URI } from "vscode-uri"
import { readFileSync } from "node:fs"
import { compile, PositionFlag } from "qingkuai/compiler"
import { isUndefined } from "../../../shared-util/assert"
import { TextDocument } from "vscode-languageserver-textdocument"

// 文档配置项，键为TextDocument.uri（string）
const clientConfigCache = new Map<string, GetClientConfigResult>()

// 避免多个客户端事件可能会导致频繁编译，crc缓存最新版本的编译结果
const compileResultCache = new Map<string, Promise<CachedCompileResultItem>>()

// 以检查模式解析qk源码文件，版本相同时不会重复解析（测试时无需判断）
export async function getCompileRes(document: TextDocument, synchronize = true) {
    const cached = await compileResultCache.get(document.uri)

    // 确保首次编译时机在语言服务器与ts插件成功建立ipc连接后
    // 测试中始终提供最新版本的文档，无需验证文档版本是否发生改变
    if (!isTestingEnv) {
        if (tpicConnectedPromise.state === "pending") {
            await tpicConnectedPromise
        }
        if (document.version === cached?.version) {
            await getConfigurationOfFile(cached)
            return cached
        }
    }

    const source = document.getText()
    const compileRes = compile(source, {
        check: true,
        typeRefStatement
    })
    const getOffset = document.offsetAt.bind(document)
    const isTS = compileRes.inputDescriptor.script.isTS
    const typeDeclarationLen = isTS ? TS_TYPE_DECLARATION_LEN : JS_TYPE_DECLARATION_LEN
    const filePath = (isTestingEnv ? document.uri : URI.parse(document.uri).fsPath) as RealPath

    // 获取指定开始索引至结束索引的vscode格式范围表达（Range）
    // 如果未传入结束索引，返回的范围固定指向开始位置（Position）
    const getRange = (start: number, end?: number) => {
        if (isUndefined(end)) {
            end = start
        }
        return {
            start: getPosition(start),
            end: getPosition(end)
        }
    }

    // 获取指定索引的vscode格式位置表达（Position）
    const getPosition = (offset: number) => {
        const { positions } = compileRes.inputDescriptor
        return {
            line: positions[offset].line - 1,
            character: positions[offset].column
        }
    }

    // 通过中间代码索引换取源码索引
    const getSourceIndex = (interIndex: number, isEnd = false) => {
        const sourceIndex = compileRes.interIndexMap.itos[interIndex]
        if (!isIndexesInvalid(sourceIndex)) {
            return sourceIndex
        }

        const preSourceIndex = compileRes.interIndexMap.itos[interIndex - 1]
        return isIndexesInvalid(sourceIndex) ? -1 : preSourceIndex + 1
    }

    // 通过源码索引换取中间代码索引
    const getInterIndex = (sourceIndex: number) => {
        const interIndex = compileRes.interIndexMap.stoi[sourceIndex]
        if (!isIndexesInvalid(interIndex)) {
            return interIndex
        }

        const preInterIndex = compileRes.interIndexMap.stoi[sourceIndex - 1]
        return isIndexesInvalid(preInterIndex) ? -1 : preInterIndex + 1
    }

    // 验证某个索引的位置信息是否设置了指定的标志位
    const isPositionFlagSet = (index: number, key: PositionFlagKeys) => {
        const positionInfo = compileRes.inputDescriptor.positions[index]
        if (isUndefined(positionInfo)) {
            return false
        }
        return (positionInfo.flag & PositionFlag[key]) !== 0
    }

    const ccri: CachedCompileResultItem = {
        ...compileRes,
        getRange,
        filePath,
        getOffset,
        getPosition,
        getInterIndex,
        getSourceIndex,
        isPositionFlagSet,
        componentInfos: [],
        config: null as any,
        isSynchronized: false,
        version: document.version,
        scriptLanguageId: isTS ? "typescript" : "javascript",
        builtInTypeDeclarationEndIndex: typeRefStatement.length + typeDeclarationLen
    }

    // 非测试环境下需要将最新的中间代码发送给typescript-plugin-qingkuai以更新快照
    const pms = new Promise<CachedCompileResultItem>(async resolve => {
        await synchronizeContentToTypescriptPlugin(ccri)
        await getConfigurationOfFile(ccri)
        resolve(ccri)
    })

    // 将编译结果同步到typescript-plugin-qingkuai
    async function synchronizeContentToTypescriptPlugin(cr: CachedCompileResultItem) {
        if (!isTestingEnv && synchronize && !cr.isSynchronized && !limitedScriptLanguageFeatures) {
            cr.componentInfos = await tpic.sendRequest<UpdateSnapshotParams>(
                TPICHandler.UpdateSnapshot,
                {
                    interCode: cr.code,
                    fileName: cr.filePath,
                    scriptKindKey: getScriptKindKey(cr),
                    slotInfo: cr.inputDescriptor.slotInfo,
                    citos: compressItos(cr.interIndexMap.itos),
                    cp: compressPosition(cr.inputDescriptor.positions),
                    cpf: compressPositionFlags(cr.inputDescriptor.positions)
                }
            )
        }
    }

    async function getConfigurationOfFile(cr: CachedCompileResultItem) {
        if (clientConfigCache.has(document.uri)) {
            cr.config = clientConfigCache.get(document.uri)!
        } else {
            const res: GetClientConfigResult = await connection.sendRequest(
                LSHandler.GetLanguageConfig,
                {
                    filePath: cr.filePath,
                    scriptPartIsTypescript: cr.inputDescriptor.script.isTS
                } satisfies GetClientConfigParams
            )
            updatePrettierConfigurationForQingkuaiFile(res)

            if (!limitedScriptLanguageFeatures && res.typescriptConfig) {
                updateTypescriptConfigurationForQingkuaiFile(res)
                tpic.sendNotification<ConfigureFileParams>(TPICHandler.ConfigureFile, {
                    fileName: cr.filePath,
                    config: res.typescriptConfig,
                    workspacePath: res.workspacePath
                })
            }
            clientConfigCache.set(document.uri, (cr.config = res))
        }
    }

    return compileResultCache.set(document.uri, pms), await pms
}

// 递归遍历qingkuai编译结果的Template Node AST
export function walk<T>(nodes: TemplateNode[], cb: (node: TemplateNode) => T | undefined) {
    for (const node of nodes) {
        const ret = cb(node)
        if (ret) {
            return ret
        }
        node.children.length && walk(node.children, cb)
    }
}

// 清空已缓存的配置内容
export function cleanConfigCache() {
    clientConfigCache.clear()
}

// 标记javascript/typescript语言功能受限
export function disableScriptLanguageFeatures() {
    setState({
        limitedScriptLanguageFeatures: true
    })
    tpicConnectedResolver()
}

// 获取未打开的文档的编译结果
export async function getCompileResByPath(path: string) {
    const cache = compileResultCache.get(path)
    if (!isUndefined(cache)) {
        return await cache
    }

    const document = TextDocument.create(
        URI.file(path).toString(),
        "qingkuai",
        1,
        readFileSync(path, "utf-8")
    )
    return await getCompileRes(document, false)
}

function updatePrettierConfigurationForQingkuaiFile(config: GetClientConfigResult) {
    const { prettierConfig: pc, extensionConfig: ec } = config
    if (isUndefined(pc.qingkuai)) {
        pc.qingkuai = {}
    }
    if (isUndefined(pc.qingkuai.spaceAroundInterpolation)) {
        pc.qingkuai.spaceAroundInterpolation = ec.insertSpaceAroundInterpolation
    }
    if (isUndefined(pc.qingkuai.componentTagFormatPreference)) {
        pc.qingkuai.componentTagFormatPreference = ec.componentTagFormatPreference
    }
    if (isUndefined(pc.qingkuai.componentAttributeFormatPreference)) {
        pc.qingkuai.componentAttributeFormatPreference = ec.componentAttributeFormatPreference
    }
}

// prettier-ignore
function updateTypescriptConfigurationForQingkuaiFile(config: GetClientConfigResult) {
    // @ts-expect-error: change read-only property
    config.typescriptConfig.formatCodeSettings.semicolons = config.prettierConfig.semi ? "insert" : "remove"

    // @ts-expect-error: change read-only property
    config.typescriptConfig.preference.quotePreference = config.prettierConfig.singleQuote ? "single" : "double"
}
