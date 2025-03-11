import type { TSDiagnostic } from "../../../../types/communication"
import type { Diagnostic, DiagnosticRelatedInformation } from "vscode-languageserver/node"

import { stringifyRange } from "../util/vscode"
import { badComponentAttrMessageRE } from "../regular"
import { debounce } from "../../../../shared-util/sundry"
import { getCompileRes, getCompileResByPath } from "../compile"
import { isNull, isUndefined } from "../../../../shared-util/assert"
import { DiagnosticTag, DiagnosticSeverity } from "vscode-languageserver/node"
import { connection, documents, isTestingEnv, tpic, waittingCommands } from "../state"

export const publishDiagnostics = debounce(
    async (uri: string) => {
        const document = documents.get(uri)
        if (!document || isTestingEnv) {
            return null
        }

        // 用于避免在相同的位置放至信息及代码均相同的ts诊断结果
        const existingTsDiagnostics = new Set<string>()

        const cr = await getCompileRes(document)
        const { Error, Warning } = DiagnosticSeverity
        const waittingForCommand = waittingCommands.get("diagnostic")
        const { messages, getRange, filePath, getSourceIndex, config } = cr

        if (waittingForCommand) {
            await tpic.sendRequest("waitCommand", waittingForCommand)
            waittingCommands.delete("diagnostic")
        }

        // 将ts语言服务的诊断信息添加到诊断结果
        const extendDiagnostic = (item: Diagnostic) => {
            const stringifiedRange = stringifyRange(item.range)
            const existingKey = `${stringifiedRange}:${item.message}(${item.code})`
            if (!existingTsDiagnostics.has(existingKey)) {
                existingTsDiagnostics.add(existingKey)
                diagnostics.push(item)
            }
        }

        // qingkuai编译器诊断结果（错误：1xxx，警告：9xxx）
        const diagnostics: Diagnostic[] = messages.map(({ type, value }) => {
            const severity = type === "error" ? Error : Warning
            const range = getRange(value.loc.start.index, value.loc.end.index)
            return {
                range,
                severity,
                source: "qk",
                code: value.code,
                message: value.message
            }
        })

        // 处理javascript/typescript语言服务的诊断结果（通过请求ts插件的ipc服务器获取)
        const tsDiagnostics = await tpic.sendRequest<string, TSDiagnostic[]>(
            "getDiagnostic",
            filePath
        )
        for (const item of tsDiagnostics) {
            const tags: DiagnosticTag[] = []
            const ss = getSourceIndex(item.start)
            const se = getSourceIndex(item.start + item.length, true)
            const relatedInformation: DiagnosticRelatedInformation[] = []

            if (isSourceIndexesIvalid(ss, se)) {
                continue
            }

            if (item.deprecated) {
                tags.push(DiagnosticTag.Deprecated)
            }
            if (item.unnecessary) {
                tags.push(DiagnosticTag.Unnecessary)
            }

            for (const relatedInfo of item.relatedInformation) {
                let range = relatedInfo.range
                if (isUndefined(range)) {
                    const cr = await getCompileResByPath(relatedInfo.filePath)
                    const rss = cr.getSourceIndex(relatedInfo.start)
                    const rse = cr.getSourceIndex(relatedInfo.start + relatedInfo.length, true)
                    if (isSourceIndexesIvalid(rss, rse)) {
                        continue
                    }
                    range = cr.getRange(rss, rse)
                }
                relatedInformation.push({
                    message: relatedInfo.message,
                    location: {
                        range,
                        uri: `file://${relatedInfo.filePath}`
                    }
                })
            }

            // 为指定的诊断信息添加qingkuai相关解释
            if (config.extensionConfig.typescriptDiagnosticsExplain) {
                if (
                    item.code === 2353 &&
                    item.source === "ts" &&
                    cr.isPositionFlagSet(ss, "isAttributeStart")
                ) {
                    const m = badComponentAttrMessageRE.exec(item.message)
                    if (!isNull(m)) {
                        item.message += `\n(Qingkuai explain): The attribute name is not a property of component's ${m[1]} type.`
                    }
                }
            }

            extendDiagnostic({
                ...item,
                tags,
                relatedInformation,
                range: getRange(ss, se),
                severity: transTsDiagnosticSeverity(item.kind)
            })
        }

        connection.sendNotification("textDocument/publishDiagnostics", { uri, diagnostics })
    },
    300,
    debounceIdGetter
)

// 清空诊断信息
export function clearDiagnostics(uri: string) {
    connection.sendNotification("textDocument/publishDiagnostics", {
        uri,
        diagnostics: []
    })
}

function debounceIdGetter(uri: string) {
    return uri
}

// typescript诊断结果类型转换为vscode需要的对应类型
function transTsDiagnosticSeverity(n: number) {
    switch (n) {
        case 0:
            return DiagnosticSeverity.Warning
        case 1:
            return DiagnosticSeverity.Error
        case 2:
            return DiagnosticSeverity.Hint
        default:
            return DiagnosticSeverity.Information
    }
}

// 检查传入的源码索引是否是无效的
function isSourceIndexesIvalid(...items: (number | undefined)[]) {
    return items.some(item => {
        return isUndefined(item) || item === -1
    })
}
