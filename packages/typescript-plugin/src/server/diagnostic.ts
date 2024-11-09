import type { Diagnostic, DiagnosticMessageChain } from "typescript"

import { languageService, projectService, server, ts } from "../state"
import { isString, isUndefined } from "../../../../shared-util/assert"
import { TSDiagnostic, TSDiagnosticRelatedInformation } from "../../../../types/communication"
import { DiagnosticType } from "../types"

export function attachGetDiagnostic() {
    server.onRequest<string, TSDiagnostic[]>("getDiagnostic", (filePath: string) => {
        const diagnostics: Diagnostic[] = []
        const diagnosticMethods: DiagnosticType[] = ["getSyntacticDiagnostics"]

        // Semtic模式下进行全部诊断，PartialSemantic/Syntactic模式下只进行语法检查
        if (projectService.serverMode === ts.LanguageServiceMode.Semantic) {
            diagnosticMethods.push("getSemanticDiagnostics", "getSuggestionDiagnostics")
        }

        diagnosticMethods.forEach(m => {
            diagnostics.push(...languageService[m](filePath))
        })

        return diagnostics.map(item => {
            const fri = (item.relatedInformation || []).filter(ri => {
                return !isUndefined(ri.file)
            })
            const relatedInformation = fri.map(ri => {
                const res: TSDiagnosticRelatedInformation = {
                    start: ri.start || 0,
                    length: ri.length || 0,
                    filePath: ri.file!.fileName,
                    message: formatDiagnosticMessage(ri.messageText)
                }

                const getRange = (offset: number) => {
                    return ri.file!.getLineAndCharacterOfPosition(offset)
                }

                // 非qk文件时通过需要返回诊断相关信息范围
                if (!res.filePath.endsWith(".qk")) {
                    res.range = {
                        start: getRange(res.start),
                        end: getRange(res.start + res.length)
                    }
                }

                return res
            })

            return {
                relatedInformation,
                code: item.code,
                kind: item.category,
                start: item.start || 0,
                length: item.length || 0,
                deprecated: Boolean(item.reportsDeprecated),
                unnecessary: Boolean(item.reportsUnnecessary),
                message: formatDiagnosticMessage(item.messageText)
            }
        })
    })
}

// 诊断信息为链表形式时，将其整理为一个字符串表示
function formatDiagnosticMessage(mt: string | DiagnosticMessageChain) {
    if (isString(mt)) {
        return mt
    }
    if (isUndefined(mt.next)) {
        return mt + mt.messageText
    }
    return mt.messageText + "  " + mt.next.reduce((p, c) => p + c.messageText, "")
}
