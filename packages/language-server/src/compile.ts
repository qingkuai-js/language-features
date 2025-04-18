import type {
    ConfigureFileParams,
    UpdateSnapshotParams,
    GetClientLanguageConfigParams,
    GetClientLanguageConfigResult
} from "../../../types/communication"
import type { TemplateNode } from "qingkuai/compiler"
import type { CompileResult, RealPath } from "../../../types/common"

import {
    tpic,
    connection,
    isTestingEnv,
    typeRefStatement,
    tpicConnectedPromise,
    limitedScriptLanguageFeatures
} from "./state"
import {
    getRangeGen,
    compressItos,
    getPositionGen,
    getInterIndexGen,
    compressPosition,
    getScriptKindKey,
    getSourceIndexGen,
    isPositionFlagSetGen,
    compressPositionFlags
} from "../../../shared-util/qingkuai"
import { URI } from "vscode-uri"
import { compile } from "qingkuai/compiler"
import { ensureGetTextDocument } from "./util"
import { isUndefined } from "../../../shared-util/assert"
import { TextDocument } from "vscode-languageserver-textdocument"
import { LSHandler, TPICHandler } from "../../../shared-util/constant"

// 避免多个客户端事件可能会导致频繁编译，crc缓存最新版本的编译结果
const compileResultCache = new Map<string, Promise<CompileResult>>()

// 文档配置项，键为TextDocument.uri（string）
const clientConfigCache = new Map<string, GetClientLanguageConfigResult>()

// 以检查模式解析qk源码文件，版本相同时不会重复解析（测试时无需判断）
export async function getCompileRes(document: TextDocument) {
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
    const getPosition = getPositionGen(compileRes.inputDescriptor.positions)
    const filePath = (isTestingEnv ? document.uri : URI.parse(document.uri).fsPath) as RealPath

    const ccri: CompileResult = {
        ...compileRes,
        filePath,
        getOffset,
        getPosition,
        uri: document.uri,
        componentInfos: [],
        config: null as any,
        isSynchronized: false,
        version: document.version,
        getRange: getRangeGen(getPosition),
        scriptLanguageId: isTS ? "typescript" : "javascript",
        getInterIndex: getInterIndexGen(compileRes.interIndexMap.stoi),
        getSourceIndex: getSourceIndexGen(compileRes.interIndexMap.itos),
        isPositionFlagSet: isPositionFlagSetGen(compileRes.inputDescriptor.positions),
        builtInTypeDeclarationEndIndex: typeRefStatement.length + compileRes.typeDeclarationLen
    }

    // 非测试环境下需要将最新的中间代码发送给typescript-plugin-qingkuai以更新快照
    const pms = new Promise<CompileResult>(async resolve => {
        await synchronizeContentToTypescriptPlugin(ccri)
        await getConfigurationOfFile(ccri)
        resolve(ccri)
    })

    // 将编译结果同步到typescript-plugin-qingkuai
    async function synchronizeContentToTypescriptPlugin(cr: CompileResult) {
        if (!isTestingEnv && !cr.isSynchronized && !limitedScriptLanguageFeatures) {
            cr.componentInfos = await tpic.sendRequest<UpdateSnapshotParams>(
                TPICHandler.UpdateSnapshot,
                {
                    interCode: cr.code,
                    version: cr.version,
                    fileName: cr.filePath,
                    scriptKindKey: getScriptKindKey(cr),
                    slotInfo: cr.inputDescriptor.slotInfo,
                    typeDeclarationLen: cr.typeDeclarationLen,
                    citos: compressItos(cr.interIndexMap.itos),
                    cp: compressPosition(cr.inputDescriptor.positions),
                    cpf: compressPositionFlags(cr.inputDescriptor.positions)
                }
            )
        }
    }

    async function getConfigurationOfFile(cr: CompileResult) {
        if (clientConfigCache.has(document.uri)) {
            cr.config = clientConfigCache.get(document.uri)!
        } else {
            const res: GetClientLanguageConfigResult = await connection.sendRequest(
                LSHandler.GetLanguageConfig,
                {
                    filePath: cr.filePath,
                    scriptPartIsTypescript: cr.inputDescriptor.script.isTS
                } satisfies GetClientLanguageConfigParams
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
    return await pms, compileResultCache.set(document.uri, pms), ccri
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

// 获取未打开的文档的编译结果
export async function getCompileResByPath(path: string) {
    return await getCompileRes(ensureGetTextDocument(URI.file(path).toString()))
}

function updatePrettierConfigurationForQingkuaiFile(config: GetClientLanguageConfigResult) {
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
function updateTypescriptConfigurationForQingkuaiFile(config: GetClientLanguageConfigResult) {
    // @ts-expect-error: change read-only property
    config.typescriptConfig.formatCodeSettings.semicolons = config.prettierConfig.semi ? "insert" : "remove"

    // @ts-expect-error: change read-only property
    config.typescriptConfig.preference.quotePreference = config.prettierConfig.singleQuote ? "single" : "double"
}
