import type {
    TSDiagnostic,
    RefreshDiagnosticParams,
    TSDiagnosticRelatedInformation
} from "../../../../../types/communication"
import type { DiagnosticKind } from "../../types"
import type { Range } from "vscode-languageserver/node"
import type { RealPath } from "../../../../../types/common"
import type { DiagnosticMessageChain, SourceFile } from "typescript"

import { refreshDiagnostics } from "./refresh"
import { ORI_SOURCE_FILE } from "../../constant"
import {
    ensureGetSnapshotOfQingkuaiFile,
    getLineAndCharacterBySourceIndex,
    getRealPath,
    getSourceIndex
} from "../../util/qingkuai"
import { getDefaultLanguageServiceByFileName } from "../../util/typescript"
import { ts, server, projectService, qingkuaiDiagnostics } from "../../state"
import { INTER_NAMESPACE, TPICHandler } from "../../../../../shared-util/constant"
import { isQingkuaiFileName, isString, isUndefined } from "../../../../../shared-util/assert"
import { isIndexesInvalid } from "../../../../../shared-util/qingkuai"

export function attachRefreshDiagnostic() {
    server.onNotification<RefreshDiagnosticParams>(
        TPICHandler.RefreshDiagnostic,
        ({ byFileName, scriptKindChanged }) => {
            refreshDiagnostics(byFileName, scriptKindChanged)
        }
    )
}

export function attachGetDiagnostic() {
    server.onRequest<RealPath, TSDiagnostic[]>(TPICHandler.GetDiagnostic, fileName => {
        const result: TSDiagnostic[] = []
        const qingkuaiSnapshot = ensureGetSnapshotOfQingkuaiFile(fileName)
        const languageService = getDefaultLanguageServiceByFileName(fileName)!
        const diagnosticMethods: DiagnosticKind[] = ["getSyntacticDiagnostics"]
        const oriDiagnostics = Array.from(qingkuaiDiagnostics.get(fileName) || [])

        // Semtic模式下进行全部诊断，PartialSemantic/Syntactic模式下只进行语法检查
        if (projectService.serverMode === ts.LanguageServiceMode.Semantic) {
            diagnosticMethods.push("getSemanticDiagnostics", "getSuggestionDiagnostics")
        }

        diagnosticMethods.forEach(m => {
            oriDiagnostics.push(...languageService[m](fileName))
        })

        for (const item of oriDiagnostics) {
            const start = item.start ?? 0
            const end = start + (item.length ?? 0)
            const ss = getSourceIndex(qingkuaiSnapshot, start)
            const se = getSourceIndex(qingkuaiSnapshot, end, true)
            if (isIndexesInvalid(ss, se)) {
                continue
            }

            const relatedInformations: TSDiagnosticRelatedInformation[] = []
            const filteredRelatedInformations = (item.relatedInformation || []).filter(ri => {
                return !isUndefined(ri.file)
            })
            for (const ri of filteredRelatedInformations) {
                let range: Range
                const start = ri.start ?? 0
                const end = start + (ri.length ?? 0)
                const realPath = getRealPath(ri.file!.fileName)
                if (!isQingkuaiFileName(realPath)) {
                    const getRange = (offset: number) => {
                        // @ts-expect-error: access additional custom property
                        const sourceFile: SourceFile = ri.file[ORI_SOURCE_FILE] ?? ri.file
                        return sourceFile.getLineAndCharacterOfPosition(offset)
                    }
                    range = { start: getRange(start), end: getRange(end) }
                } else {
                    const snapshot = ensureGetSnapshotOfQingkuaiFile(realPath)
                    const ss = getSourceIndex(snapshot, start)
                    const se = getSourceIndex(snapshot, end, true)
                    if (isIndexesInvalid(ss, se)) {
                        continue
                    }
                    range = {
                        start: getLineAndCharacterBySourceIndex(snapshot, ss!),
                        end: getLineAndCharacterBySourceIndex(snapshot, se!)
                    }
                }
                relatedInformations.push({
                    range,
                    filePath: getRealPath(ri.file!.fileName),
                    message: formatDiagnosticMessage(ri.messageText)
                })
            }

            result.push({
                relatedInformations,
                code: item.code,
                kind: item.category,
                source: item.source || "ts",
                deprecated: Boolean(item.reportsDeprecated),
                unnecessary: Boolean(item.reportsUnnecessary),
                message: formatDiagnosticMessage(item.messageText),
                range: {
                    start: getLineAndCharacterBySourceIndex(qingkuaiSnapshot, ss!),
                    end: getLineAndCharacterBySourceIndex(qingkuaiSnapshot, se!)
                }
            })
        }
        return result
    })
}

// 诊断信息为链表形式时，将其整理为一个字符串表示
function formatDiagnosticMessage(mt: string | DiagnosticMessageChain, indentLevel = 0): string {
    const indent = " ".repeat(indentLevel * 2)

    const eliminate = (s: string) => {
        return s.replace(` Did you mean '${INTER_NAMESPACE}'?`, "")
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
