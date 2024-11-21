import type { Diagnostic, DiagnosticRelatedInformation } from "vscode-languageserver/node"

import { getCompileRes } from "../compile"
import { stringifyRange } from "../util/vscode"
import { GlobalTypeMissTypeImpl } from "../messages"
import { GlobalTypeRefsToValueRE } from "../regular"
import { connection, documents, tpic } from "../state"
import { debounce } from "../../../../shared-util/sundry"
import { TSDiagnostic } from "../../../../types/communication"
import { isNull, isUndefined } from "../../../../shared-util/assert"
import { DiagnosticTag, DiagnosticSeverity } from "vscode-languageserver/node"

export const publishDiagnostics = debounce(
    async (uri: string) => {
        const textDocument = documents.get(uri)
        if (isUndefined(textDocument)) {
            return
        }

        // 用于避免在相同的位置放至信息及代码均相同的ts诊断结果
        const existingTsDiagnostics = new Set<string>()

        const cr = await getCompileRes(textDocument)
        const { Error, Warning } = DiagnosticSeverity
        const { messages, getRange, filePath, getSourceIndex } = cr
        const scriptStartTagNamgeRange = cr.inputDescriptor.script.startTagNameRange

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

        // 处理javascript/typescript语言服务的诊断结果（通过请求typescript-qingkuai-plugin的ipc服务器获取)
        ;(await tpic.sendRequest<string, TSDiagnostic[]>("getDiagnostic", filePath)).forEach(
            item => {
                const tags: DiagnosticTag[] = []
                const ss = getSourceIndex(item.start)
                const se = getSourceIndex(item.start + item.length)
                const relatedInformation: DiagnosticRelatedInformation[] = []

                if (isSourceIndexesIvalid(ss, se)) {
                    if (item.code === 2749) {
                        const m = GlobalTypeRefsToValueRE.exec(item.message)
                        if (!isNull(m)) {
                            extendDiagnostic({
                                source: "qk",
                                ...GlobalTypeMissTypeImpl(m[1]),
                                range: getRange(...scriptStartTagNamgeRange),
                                severity: transTsDiagnosticSeverity(item.kind)
                            })
                        }
                    }
                    return
                }

                if (item.deprecated) {
                    tags.push(DiagnosticTag.Deprecated)
                }
                if (item.unnecessary) {
                    tags.push(DiagnosticTag.Unnecessary)
                }

                item.relatedInformation.forEach(ri => {
                    const rss = getSourceIndex(ri.start)
                    const rse = getSourceIndex(ri.start + ri.length)
                    if (!isSourceIndexesIvalid(rss, rse)) {
                        relatedInformation.push({
                            message: ri.message,
                            location: {
                                uri: `file://${ri.filePath}`,
                                range: ri.range || getRange(rss, rse)
                            }
                        })
                    }
                })

                extendDiagnostic({
                    tags,
                    relatedInformation,
                    source: "ts",
                    code: item.code,
                    message: item.message,
                    range: getRange(ss, se),
                    severity: transTsDiagnosticSeverity(item.kind)
                })
            }
        )

        connection.sendNotification("textDocument/publishDiagnostics", {
            diagnostics,
            uri: textDocument.uri,
            version: textDocument.version
        })
    },
    200,
    debounceIdGetter
)

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
