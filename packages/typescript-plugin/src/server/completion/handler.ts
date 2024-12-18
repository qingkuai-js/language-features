import type {
    GetCompletionParams,
    GetCompletionResult,
    ResolveCompletionResult,
    ResolveCompletionParams,
    GetCompletionResultEntry
} from "../../../../../types/communication"
import type { CompletionEntry, DocumentSpan, SymbolDisplayPart, UserPreferences } from "typescript"

import { scriptExensions } from "../../constant"
import { getMappingFileName } from "../content/document"
import { isUndefined } from "../../../../../shared-util/assert"
import { excludeProperty } from "../../../../../shared-util/sundry"
import { languageService, Logger, projectService, server, ts } from "../../state"

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
    server.onRequest<GetCompletionParams, GetCompletionResult>("getCompletion", params => {
        const mappingFileName = getMappingFileName(params.fileName)
        if (isUndefined(mappingFileName)) {
            return null
        }

        const completionRes = languageService.getCompletionsAtPosition(
            mappingFileName,
            params.pos,
            getUserPreferencesByFileName(mappingFileName),
            getFormatCodeSettingsByFileName(mappingFileName)
        )
        if (isUndefined(completionRes)) {
            return null
        }
        const completionItems: GetCompletionResultEntry[] = completionRes.entries.map(item => {
            const kindModifiers = parseKindModifier(item.kindModifiers)
            const ret: GetCompletionResultEntry = {
                name: item.name,
                kind: item.kind,
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
    })

    server.onRequest<ResolveCompletionParams, ResolveCompletionResult>(
        "resolveCompletion",
        ({ fileName, entryName, pos, ori, source }) => {
            const mappingFileName = getMappingFileName(fileName)!
            const preferences = getUserPreferencesByFileName(mappingFileName)
            const formatSettings = getFormatCodeSettingsByFileName(mappingFileName)
            const detailRes = languageService.getCompletionEntryDetails(
                mappingFileName,
                pos,
                entryName,
                formatSettings,
                source,
                preferences,
                ori
            )

            const detailSections = (detailRes?.codeActions || []).map(item => {
                return item.description
            })
            if (detailSections.length) {
                detailSections.push("\n\n")
            }
            detailSections.push(ts.displayPartsToString(detailRes?.displayParts))

            return {
                detail: detailSections.join(""),
                documentation: convertToPlainTextWithLink(detailRes?.documentation)
            }
        }
    )
}

function getScriptKindDetails(entry: CompletionEntry) {
    if (!entry.kindModifiers || entry.kind !== ts.ScriptElementKind.scriptElement) {
        return
    }

    const kindModifiers = parseKindModifier(entry.kindModifiers)
    for (const extModifier of scriptExensions) {
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

// 将SymbolDisplayPart[]类型转换为带有链接的markdown纯文本
function convertToPlainTextWithLink(parts: SymbolDisplayPart[] | undefined) {
    if (isUndefined(parts)) {
        return ""
    }

    return parts.reduce((ret, part) => {
        if (part.kind === "linkText") {
            let spaceIndex = part.text.indexOf(" ")
            if (spaceIndex === -1) {
                spaceIndex = part.text.length
            }
            return ret + `[${part.text.slice(spaceIndex)}](${part.text.slice(0, spaceIndex)})`
        } else if (part.kind === "linkName") {
            const target: DocumentSpan = (part as any).target
            const args = encodeURIComponent(
                JSON.stringify({
                    path: target.fileName,
                    end: target.textSpan.start,
                    start: target.textSpan.start
                })
            )
            return ret + `[${part.text}](command:qingkuai.openFileByFilePath?${args})`
        }
        return ret + (part.kind === "link" ? "" : part.text)
    }, "")
}

function getUserPreferencesByFileName(fileName: string): UserPreferences {
    const userPreferences = excludeProperty(
        projectService.getPreferences(ts.server.toNormalizedPath(fileName)),
        "lazyConfiguredProjectsFromExternalProject"
    )
    return {
        ...userPreferences,
        includeCompletionsWithInsertText: true,
        includeCompletionsForModuleExports: true
    }
}

function getFormatCodeSettingsByFileName(fileName: string) {
    return projectService.getFormatCodeOptions(ts.server.toNormalizedPath(fileName))
}
