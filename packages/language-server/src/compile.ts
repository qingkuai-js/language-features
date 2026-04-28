import type {
    ConfigureFileParams,
    UpdateContentParams,
    UpdateContentResult,
    GetClientLanguageConfigResult
} from "../../../types/communication"
import type { CompileResult } from "../../../types/common"
import type { ASTLocation, TemplateNode } from "qingkuai/compiler"

import {
    tpic,
    connection,
    isTestingEnv,
    tpicConnectedPromise,
    limitedScriptLanguageFeatures
} from "./state"
import {
    compressPositions,
    recoverNumberArray,
    compressNumberArray
} from "../../../shared-util/qingkuai"
import { URI } from "vscode-uri"
import { ensureGetTextDocument } from "./util"
import { compileIntermediate } from "qingkuai/compiler"
import { TextDocument } from "vscode-languageserver-textdocument"
import { isNumber, isUndefined } from "../../../shared-util/assert"
import { LS_HANDLERS, TP_HANDLERS } from "../../../shared-util/constant"

const compileCache = new Map<string, Promise<CompileResult>>()
const configCache = new Map<string, GetClientLanguageConfigResult>()

// 以检查模式解析qk源码文件，版本相同时不会重复解析（测试时无需判断）
export async function getCompileResult(document: TextDocument) {
    const cached = await compileCache.get(document.uri)
    const filePath = isTestingEnv ? document.uri : URI.parse(document.uri).fsPath

    // 确保首次编译时机在语言服务器与ts插件成功建立ipc连接后
    // 测试中始终提供最新版本的文档，无需验证文档版本是否发生改变
    if (!isTestingEnv) {
        if (tpicConnectedPromise.state === "pending") {
            await tpicConnectedPromise
        }
        if (document.version === cached?.version) {
            return cached
        }
    }

    const clientConfig = await getConfigurationOfFile()
    const compileResult = compileIntermediate(document.getText(), {
        shorthandDerivedDeclaration: clientConfig.qingkuaiConfig.shorthandDerivedDeclaration
    })
    const isTS = compileResult.scriptDescriptor.isTS
    const scriptLanguageId = isTS ? "typescript" : "javascript"

    const ret: CompileResult = Object.assign(compileResult, {
        filePath,
        document,
        scriptLanguageId,
        uri: document.uri,
        config: clientConfig,
        isSynchronized: false,
        version: document.version,
        getVscodeRange(startOrLoc: number | ASTLocation, end?: number) {
            if (isNumber(startOrLoc)) {
                return {
                    start: document.positionAt(startOrLoc),
                    end: document.positionAt(end ?? startOrLoc)
                }
            }
            return {
                start: document.positionAt(startOrLoc.start.index),
                end: document.positionAt(startOrLoc.end.index)
            }
        }
    } as const)

    // 非测试环境下需要将最新的中间代码发送给typescript-plugin-qingkuai以更新快照
    const pms = (async () => {
        if (!ret.isSynchronized) {
            await synchronizeContentToTypescriptPlugin()
            await getConfigurationOfFile()
            ret.isSynchronized = true
        }
        return ret
    })().catch(err => {
        compileCache.delete(document.uri)
        throw err
    })

    // 将编译结果同步到typescript-plugin-qingkuai
    async function synchronizeContentToTypescriptPlugin() {
        if (!isTestingEnv && !limitedScriptLanguageFeatures) {
            const adjustedIndexMap: UpdateContentResult =
                await tpic.sendRequest<UpdateContentParams>(TP_HANDLERS.UpdateContent, {
                    isTS,
                    fileName: filePath,
                    content: compileResult.code,
                    positions: compressPositions(ret.positions),
                    itos: compressNumberArray(ret.indexMap.itos),
                    stoi: compressNumberArray(ret.indexMap.stoi),
                    identifierStatusInfo: compileResult.identifierStatusInfo,
                    getTypeDelayIndexes: compileResult.getTypeDelayInterIndexes,
                    positionFlags: compressNumberArray(ret.positions.map(pos => pos.flag))
                })
            ret.indexMap.itos = recoverNumberArray(adjustedIndexMap.aitos)
            ret.indexMap.stoi = recoverNumberArray(adjustedIndexMap.astoi)
        }
    }

    async function getConfigurationOfFile() {
        if (configCache.has(filePath)) {
            return configCache.get(filePath)!
        }

        const res: GetClientLanguageConfigResult = await connection.sendRequest(
            LS_HANDLERS.GetLanguageConfig,
            filePath
        )
        updatePrettierConfigurationForQingkuaiFile(res)

        if (!limitedScriptLanguageFeatures && res.typescriptConfig) {
            updateTypescriptConfigurationForQingkuaiFile(res)
            tpic.sendNotification<ConfigureFileParams>(TP_HANDLERS.ConfigureFile, {
                ...res,
                fileName: filePath
            })
        }
        return res
    }

    return (compileCache.set(document.uri, pms), await pms)
}

// 清空已缓存的配置内容
export function cleanConfigCache() {
    configCache.clear()
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

// 获取未打开的文档的编译结果
export async function getCompileResultByPath(path: string) {
    return await getCompileResult(ensureGetTextDocument(URI.file(path).toString()))
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
