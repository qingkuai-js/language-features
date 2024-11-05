import type { DiagnosticHandler } from "../types/handlers"
import type { TSDiagnostic } from "../../../../types/communication"
import type { Diagnostic, DiagnosticRelatedInformation } from "vscode-languageserver/node"

import {
    DiagnosticTag,
    DiagnosticSeverity,
    DocumentDiagnosticReportKind
} from "vscode-languageserver/node"
import { getCompileRes, tpic } from "../state"
import { isUndefined } from "../../../../shared-util/assert"

export const diagnostic: DiagnosticHandler = async ({ textDocument }) => {
    const cr = await getCompileRes(textDocument)
    const { Error, Warning } = DiagnosticSeverity
    const { messages, getRange, filePath, getSourceIndex } = cr

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

    // javascript/typescript诊断结果，由qingkuai-typescript-plugin诊断中间代码并返回
    ;(await tpic.sendRequest<string, TSDiagnostic[]>("getDiagnostic", filePath)).forEach(item => {
        const tags: DiagnosticTag[] = []
        const sourceStart = getSourceIndex(item.start)
        const relatedInformation: DiagnosticRelatedInformation[] = []

        if (item.deprecated) {
            tags.push(DiagnosticTag.Deprecated)
        }
        if (item.unnecessary) {
            tags.push(DiagnosticTag.Unnecessary)
        }

        item.relatedInformation.forEach(ri => {
            let range = ri.range
            if (isUndefined(ri.range)) {
                const rss = getSourceIndex(ri.start)
                range = getRange(rss, rss + ri.length)
            }
            relatedInformation.push({
                message: ri.message,
                location: {
                    range: range!,
                    uri: `file://${ri.filePath}`
                }
            })
        })

        diagnostics.push({
            tags,
            relatedInformation,
            source: "ts",
            code: item.code,
            message: item.message,
            severity: transTsDiagnosticSeverity(item.kind),
            range: getRange(sourceStart, sourceStart + item.length)
        })
    })

    return {
        items: diagnostics,
        kind: DocumentDiagnosticReportKind.Full
    }
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
