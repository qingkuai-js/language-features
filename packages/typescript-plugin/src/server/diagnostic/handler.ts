import {
    RefreshDiagnosticParams,
    type TSDiagnostic,
    type TSDiagnosticRelatedInformation
} from "../../../../../types/communication"
import type { DiagnosticKind } from "../../types"
import type { DiagnosticMessageChain, SourceFile } from "typescript"

import { refreshDiagnostics } from "./refresh"
import { ORI_SOURCE_FILE } from "../../constant"
import { TPICHandler } from "../../../../../shared-util/constant"
import { isString, isUndefined } from "../../../../../shared-util/assert"
import { ts, server, projectService, qingkuaiDiagnostics } from "../../state"

export function attachRefreshDiagnostic() {
    server.onNotification<RefreshDiagnosticParams>(
        TPICHandler.refreshDiagnostic,
        ({ byFileName, scriptKindChanged }) => {
            refreshDiagnostics(byFileName, scriptKindChanged)
        }
    )
}

export function attachGetDiagnostic() {
    server.onRequest<string, TSDiagnostic[]>(TPICHandler.getDiagnostic, fileName => {
        const project = projectService.getDefaultProjectForFile(
            ts.server.toNormalizedPath(fileName),
            false
        )!
        const languageService = project.getLanguageService()
        const diagnosticMethods: DiagnosticKind[] = ["getSyntacticDiagnostics"]
        const oriDiagnostics = Array.from(qingkuaiDiagnostics.get(fileName) || [])

        // Semtic模式下进行全部诊断，PartialSemantic/Syntactic模式下只进行语法检查
        if (projectService.serverMode === ts.LanguageServiceMode.Semantic) {
            diagnosticMethods.push("getSemanticDiagnostics", "getSuggestionDiagnostics")
        }

        diagnosticMethods.forEach(m => {
            oriDiagnostics.push(...languageService[m](fileName))
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
                    // @ts-expect-error: access additional custom property
                    const sourceFile: SourceFile = ri.file[ORI_SOURCE_FILE] ?? ri.file
                    return sourceFile.getLineAndCharacterOfPosition(offset)
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
                start: item.start || 0,
                length: item.length || 0,
                source: item.source || "ts",
                deprecated: Boolean(item.reportsDeprecated),
                unnecessary: Boolean(item.reportsUnnecessary),
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
