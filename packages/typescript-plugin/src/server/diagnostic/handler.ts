import type {
    TSDiagnostic,
    TSDiagnosticRelatedInformation
} from "../../../../../types/communication"
import type { DiagnosticKind } from "../../types"
import type { DiagnosticMessageChain } from "typescript"

import { getMappingFileInfo } from "../content/document"
import { isString, isUndefined } from "../../../../../shared-util/assert"
import { ts, server, projectService, languageService, qingkuaiDiagnostics } from "../../state"

export function attachGetDiagnostic() {
    server.onRequest<string, TSDiagnostic[]>("getDiagnostic", fileName => {
        const mappingFileInfo = getMappingFileInfo(fileName)!
        const mappingFileName = mappingFileInfo.mappingFileName
        const diagnosticMethods: DiagnosticKind[] = ["getSyntacticDiagnostics"]
        const oriDiagnostics = Array.from(qingkuaiDiagnostics.get(mappingFileName) || [])

        // Semtic模式下进行全部诊断，PartialSemantic/Syntactic模式下只进行语法检查
        if (projectService.serverMode === ts.LanguageServiceMode.Semantic) {
            diagnosticMethods.push("getSemanticDiagnostics", "getSuggestionDiagnostics")
        }

        diagnosticMethods.forEach(m => {
            oriDiagnostics.push(...languageService[m](mappingFileName))
        })

        return oriDiagnostics.map(item => {
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

                // 非qk文件时需要返回诊断相关信息范围
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
                length: item.length || 0,
                source: item.source || "ts",
                deprecated: Boolean(item.reportsDeprecated),
                unnecessary: Boolean(item.reportsUnnecessary),
                start: mappingFileInfo.getPos(item.start || 0),
                message: formatDiagnosticMessage(item.messageText)
            }
        })
    })
}

// 诊断信息为链表形式时，将其整理为一个字符串表示
function formatDiagnosticMessage(mt: string | DiagnosticMessageChain, indentLevel = 0): string {
    const indent = " ".repeat(indentLevel * 2)

    const eliminate = (s: string) => {
        return s.replace(" Did you mean '__c__'?", "")
    }

    if (isString(mt)) {
        return eliminate(mt)
    }

    if (isUndefined(mt.next)) {
        return eliminate(mt.messageText)
    }

    const nextMsg = mt.next.reduce((p, c) => {
        return p + indent + formatDiagnosticMessage(c, indentLevel + 1)
    }, "")

    return eliminate(mt.messageText) + "\n" + nextMsg
}
