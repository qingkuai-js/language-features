import type { DiagnosticResult } from "../../../../types/communication"
import type { Diagnostic, DiagnosticRelatedInformation } from "vscode-languageserver/node"

import { getCompileRes } from "../compile"
import { stringifyRange } from "../util/vscode"
import { connection, documents, tpic } from "../state"
import { debounce } from "../../../../shared-util/sundry"
import { isNull, isUndefined } from "../../../../shared-util/assert"
import { GlobalTypeIsImplicitAny, GlobalTypeMissTypeImpl } from "../messages"
import { DiagnosticTag, DiagnosticSeverity } from "vscode-languageserver/node"
import { GlobalTypeNotFoundMessageRE, GlobalTypeRefsToValueRE } from "../regular"

export const publishDiagnostics = debounce(async (uri: string) => {
    const textDocument = documents.get(uri)
    if (isUndefined(textDocument)) {
        return
    }

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

    // 用于避免在相同的位置放至信息及代码均相同的ts诊断结果
    const existingTsDiagnostics = new Set<string>()

    // javascript/typescript诊断结果，由qingkuai-typescript-plugin诊断中间代码并返回
    const tsDiagnosticResult = await tpic.sendRequest<string, DiagnosticResult>(
        "getDiagnostic",
        filePath
    )

    tsDiagnosticResult.diagnostics.forEach(item => {
        const tags: DiagnosticTag[] = []
        const ss = getSourceIndex(item.start)
        const se = getSourceIndex(item.start + item.length)
        const relatedInformation: DiagnosticRelatedInformation[] = []

        if (isSourceIndexesIvalid(ss, se)) {
            if (item.code === 2304) {
                const m = GlobalTypeNotFoundMessageRE.exec(item.message)
                const sk = tsDiagnosticResult.noImplicitAny ? "Error" : "Hint"
                if (!isNull(m)) {
                    extendDiagnostic({
                        source: "qk",
                        ...GlobalTypeIsImplicitAny(m[1]),
                        severity: DiagnosticSeverity[sk],
                        range: getRange(...scriptStartTagNamgeRange)
                    })
                }
            } else if (item.code === 2749) {
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
    })

    connection.sendNotification("textDocument/publishDiagnostics", {
        diagnostics,
        uri: textDocument.uri,
        version: textDocument.version
    })
}, 200)

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
