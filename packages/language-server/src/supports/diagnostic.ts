import { Diagnostic } from "vscode-languageserver"
import type { DiagnosticHandler } from "../types/handlers"

import { documents } from "../state"
import { compile, isCompileError } from "qingkuai/compiler"
import { isUndefined } from "../../../../shared-util/assert"
import { DocumentDiagnosticReportKind } from "vscode-languageserver"

export const diagnostic: DiagnosticHandler = params => {
    return {
        kind: DocumentDiagnosticReportKind.Full,
        items: []
    }

    // const document = documents.get(params.textDocument.uri)!.getText()
    // const messages = compile(document, {
    //     componentName: "",
    //     check: true
    // }).messages.filter(({ value }) => {
    //     return !isUndefined(value.loc) && value.message
    // })

    // const diagnostics = messages.map(({ type, value }) => {
    //     const fromQingKuai = (type === "error" && isCompileError(value)) || type === "warning"
    //     const [startPos, endPos] = [value.loc.start || value.loc, value.loc.end || value.loc]
    //     return {
    //         severity: type === "error" ? 1 : 2,
    //         range: {
    //             start: {
    //                 line: startPos.line - 1,
    //                 character: startPos.column
    //             },
    //             end: {
    //                 line: endPos.line - 1,
    //                 character: endPos.column
    //             }
    //         },
    //         code: fromQingKuai ? value.code : (value as any).reasonCode || "",
    //         source: fromQingKuai ? "qk" : "",
    //         message: value.message
    //     } satisfies Diagnostic
    // })
    // return {
    //     kind: DocumentDiagnosticReportKind.Full,
    //     items: diagnostics
    // }
}
