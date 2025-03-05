import type {
    UpdateSnapshotParams,
    GetClientConfigParams,
    GetClientConfigResult,
    ConfigureFileParams
} from "../../../types/communication"
import type { PositionFlagKeys } from "qingkuai/compiler"
import type { CachedCompileResultItem } from "./types/service"

import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { compile, PositionFlag } from "qingkuai/compiler"
import { isUndefined } from "../../../shared-util/assert"
import { getScriptKindKey } from "../../../shared-util/qingkuai"
import { TextDocument } from "vscode-languageserver-textdocument"
import { tpic, connection, isTestingEnv, typeRefStatement, tpicConnectedPromise } from "./state"

// 文档的扩展配置项，键为TextDocument.uri（string）
const extensionConfigCache = new Map<string, GetClientConfigResult>()

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
    const filePath = isTestingEnv ? document.uri : fileURLToPath(document.uri)

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
        if (sourceIndex !== -1 || !isEnd) {
            return sourceIndex
        }

        const preSourceIndex = compileRes.interIndexMap.itos[interIndex - 1]
        return preSourceIndex === -1 ? -1 : preSourceIndex + 1
    }

    // 通过源码索引换取中间代码索引
    const getInterIndex = (sourceIndex: number) => {
        return compileRes.interIndexMap.stoi[sourceIndex]
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
        document,
        getOffset,
        getPosition,
        getInterIndex,
        getSourceIndex,
        isPositionFlagSet,
        componentInfos: [],
        config: null as any,
        isSynchronized: false,
        version: document.version,
        builtInTypeDeclarationEndIndex: typeRefStatement.length + (isTS ? 119 : 114)
    }

    // 非测试环境下需要将最新的中间代码发送给typescript-plugin-qingkuai以更新快照
    const pms = new Promise<CachedCompileResultItem>(async resolve => {
        await synchronizeContentToTypescriptPlugin(ccri)
        await getConfigurationOfFile(ccri)
        resolve(ccri)
    })

    // 将编译结果同步到typescript-plugin-qingkuai
    async function synchronizeContentToTypescriptPlugin(cr: CachedCompileResultItem) {
        if (!isTestingEnv && synchronize && !cr.isSynchronized) {
            cr.componentInfos = await tpic.sendRequest<UpdateSnapshotParams>("updateSnapshot", {
                interCode: cr.code,
                fileName: cr.filePath,
                itos: cr.interIndexMap.itos,
                scriptKindKey: getScriptKindKey(cr),
                slotInfo: cr.inputDescriptor.slotInfo
            })
        }
    }

    async function getConfigurationOfFile(cr: CachedCompileResultItem) {
        if (extensionConfigCache.has(document.uri)) {
            cr.config = extensionConfigCache.get(document.uri)!
        } else {
            const res: GetClientConfigResult = await connection.sendRequest(
                "qingkuai/getClientConfig",
                {
                    filePath: cr.filePath,
                    scriptPartIsTypescript: cr.inputDescriptor.script.isTS
                } satisfies GetClientConfigParams
            )
            if (res.typescriptConfig) {
                updateTypescriptConfigurationForQingkuaiFile(res)
                tpic.sendNotification<ConfigureFileParams>("configureFile", {
                    fileName: cr.filePath,
                    config: res.typescriptConfig,
                    workspacePath: res.workspacePath
                })
            }
            extensionConfigCache.set(document.uri, (cr.config = res))
        }
    }

    return compileResultCache.set(document.uri, pms), await pms
}

// 获取未打开的文档的编译结果
export async function getCompileResByPath(path: string) {
    const cache = compileResultCache.get(path)
    if (!isUndefined(cache)) {
        return await cache
    }

    const document = TextDocument.create(
        `file://${path}`,
        "qingkuai",
        1,
        readFileSync(path, "utf-8")
    )
    return await getCompileRes(document, false)
}

// 清空已缓存的配置内容
export function clearConfigCache() {
    extensionConfigCache.clear()
}

// prettier-ignore
function updateTypescriptConfigurationForQingkuaiFile(config: GetClientConfigResult) {
    // @ts-expect-error: change read-only property
    config.typescriptConfig.formatCodeSettings.semicolons = config.prettierConfig.semi ? "insert" : "remove"

    // @ts-expect-error: change read-only property
    config.typescriptConfig.preference.quotePreference = config.prettierConfig.singleQuote ? "single" : "double"
}
