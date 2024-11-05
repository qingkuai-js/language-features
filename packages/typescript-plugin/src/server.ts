import {
    TSDiagnostic,
    type UpdateSnapshotParams,
    TSDiagnosticRelatedInformation
} from "../../../types/communication"
import type { Diagnostic, DiagnosticMessageChain } from "typescript"

import { QingKuaiSnapShot } from "./snapshot"
import { snapshotCache } from "./proxy/getSnapshot"
import { isString, isUndefined } from "../../../shared-util/assert"
import { languageService, project, projectService, server, ts } from "./state"

export function attachServerHandlers() {
    server.onRequest<UpdateSnapshotParams>("updateSnapshot", ({ fileName, interCode }) => {
        const oldSnapshot = snapshotCache.get(fileName)
        const newSnapshot = new QingKuaiSnapShot(interCode)
        const scriptInfo = projectService.getScriptInfo(fileName)
        if (isUndefined(scriptInfo) || isUndefined(oldSnapshot)) {
            projectService.openClientFile(fileName, newSnapshot.getFullText(), ts.ScriptKind.TS)
            project.addRoot(projectService.getScriptInfo(fileName)!)
        } else {
            const change = newSnapshot.getChangeRange(oldSnapshot)
            const changeStart = change.span.start
            scriptInfo.editContent(
                changeStart,
                changeStart + change.span.length,
                newSnapshot.getText(changeStart, changeStart + change.newLength)
            )
        }
        return snapshotCache.set(fileName, newSnapshot), ""
    })

    server.onRequest<string, TSDiagnostic[]>("getDiagnostic", (filePath: string) => {
        const diagnostics: Diagnostic[] = []
        const diagnosticMethods = [
            "getSemanticDiagnostics",
            "getSyntacticDiagnostics",
            "getSuggestionDiagnostics"
        ] as const

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
