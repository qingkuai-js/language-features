import type {
    GetCompletionResult,
    ResolveCompletionResult,
    TPICCommonRequestParams,
    ResolveCompletionParams,
    GetCompletionResultEntry,
    ResolveCompletionTextEdit
} from "../../../../types/communication"
import type { CompletionEntry } from "typescript"
import type { Command } from "vscode-languageserver"

import {
    getUserPreferencesByFileName,
    getFormatCodeSettingsByFileName,
    getDefaultLanguageServiceByFileName,
    convertDisplayPartsToPlainTextWithLink
} from "../util/typescript"
import { server, ts } from "../state"
import { SCRIPT_EXTENSIONS } from "../constant"
import { isUndefined } from "../../../../shared-util/assert"
import { TPICHandler } from "../../../../shared-util/constant"

const optionalSameKeys = [
    "data",
    "sortText",
    "isSnippet",
    "filterText",
    "insertText",
    "labelDetails",
    "replacementSpan",
    "commitCharacters"
] as const

export function attachGetCompletion() {
    server.onRequest<TPICCommonRequestParams, GetCompletionResult>(
        TPICHandler.GetCompletion,
        params => {
            const languageService = getDefaultLanguageServiceByFileName(params.fileName)
            const completionRes = languageService?.getCompletionsAtPosition(
                params.fileName,
                params.pos,
                getUserPreferencesByFileName(params.fileName),
                getFormatCodeSettingsByFileName(params.fileName)
            )

            if (isUndefined(completionRes)) {
                return null
            }

            const completionItems: GetCompletionResultEntry[] = completionRes.entries.map(item => {
                const kindModifiers = parseKindModifier(item.kindModifiers)
                const ret: GetCompletionResultEntry = {
                    name: item.name,
                    kind: item.kind,
                    source: item.source,
                    detail: getScriptKindDetails(item),
                    label: item.name || (item.insertText ?? "")
                }
                if (item.isRecommended) {
                    ret.preselect = true
                }
                if (kindModifiers.has("color")) {
                    ret.isColor = true
                }
                if (kindModifiers.has("optional")) {
                    ret.label += "?"
                }
                if (kindModifiers.has("deprecated")) {
                    ret.deprecated = true
                }
                optionalSameKeys.forEach(key => {
                    // @ts-expect-error
                    item[key] && (ret[key] = item[key])
                })
                return ret
            })

            return {
                entries: completionItems,
                isIncomplete: !!completionRes.isIncomplete,
                defaultRepalcementSpan: completionRes.optionalReplacementSpan,
                defaultCommitCharacters: completionRes.defaultCommitCharacters ?? []
            }
        }
    )

    server.onRequest<ResolveCompletionParams, ResolveCompletionResult>(
        TPICHandler.ResolveCompletionItem,
        ({ fileName, entryName, pos, ori, source }) => {
            const preferences = getUserPreferencesByFileName(fileName)
            const formatSettings = getFormatCodeSettingsByFileName(fileName)
            const languageService = getDefaultLanguageServiceByFileName(fileName)

            const detailRes = languageService?.getCompletionEntryDetails(
                fileName,
                pos,
                entryName,
                formatSettings,
                source,
                preferences,
                ori
            )

            let command: Command | undefined = undefined
            const [detailSections, textEdits]: [string[], ResolveCompletionTextEdit[]] = [[], []]

            if (detailRes?.codeActions) {
                for (
                    let i = 0, hasRemainingCommandOrEdits = false;
                    i < detailRes.codeActions.length;
                    i++
                ) {
                    const action = detailRes.codeActions[i]
                    if (action.commands) {
                        hasRemainingCommandOrEdits = true
                    }
                    action.changes.forEach(change => {
                        if (change.fileName === fileName) {
                            textEdits.push(
                                ...change.textChanges.map(item => {
                                    return {
                                        newText: item.newText,
                                        start: item.span.start,
                                        end: item.span.start + item.span.length
                                    }
                                })
                            )
                        } else {
                            hasRemainingCommandOrEdits = true
                        }
                    })
                    if (hasRemainingCommandOrEdits) {
                        command = {
                            title: "",
                            arguments: [
                                fileName,
                                detailRes.codeActions.map(action => {
                                    let changes = action.changes.filter(
                                        x => x.fileName !== fileName
                                    )
                                    changes = changes.map(x => {
                                        return { ...x, fileName }
                                    })
                                    return { ...action, changes }
                                })
                            ],
                            command: "_typescript.applyCompletionCodeAction"
                        }
                    }
                    detailSections.push(action.description)
                }
                detailSections.push("\n\n")
            }

            detailSections.push(ts.displayPartsToString(detailRes?.displayParts))

            return {
                command,
                textEdits,
                detail: detailSections.join("") || undefined,
                documentation:
                    convertDisplayPartsToPlainTextWithLink(detailRes?.documentation) || undefined
            }
        }
    )
}

function getScriptKindDetails(entry: CompletionEntry) {
    if (!entry.kindModifiers || entry.kind !== ts.ScriptElementKind.scriptElement) {
        return
    }

    const kindModifiers = parseKindModifier(entry.kindModifiers)
    for (const extModifier of SCRIPT_EXTENSIONS) {
        if (kindModifiers.has(extModifier)) {
            if (entry.name.toLowerCase().endsWith(extModifier)) {
                return entry.name
            } else {
                return entry.name + extModifier
            }
        }
    }
    return undefined
}

function parseKindModifier(kindModifiers: string | undefined) {
    if (isUndefined(kindModifiers)) {
        kindModifiers = ""
    }
    return new Set(kindModifiers.split(/,|\s+/g))
}
