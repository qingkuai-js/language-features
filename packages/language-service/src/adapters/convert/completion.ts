import type {
    GetCompletionsResult,
    ResolveCompletionParams,
    TPICCommonRequestParams,
    GetCompletionsResultEntry
} from "../../../../../types/communication"
import type TS from "typescript"
import type { ScriptCompletionDetail, TextEditWithPosRange } from "../../types/service"

import { SCRIPT_EXTENSIONS } from "../../constants"
import { getRealPath, getSourceIndex } from "../qingkuai"
import { isUndefined } from "../../../../../shared-util/assert"
import { addImportTextEditRE, qkExtInImportRE } from "../../regular"
import { INTER_NAMESPACE } from "../../../../../shared-util/constant"
import { convertDisplayPartsToPlainTextWithLink } from "./typescript"
import { isIndexesInvalid } from "../../../../../shared-util/qingkuai"
import { getConfig, getFormattingOptions, getUserPreferences, ts } from "../state"

export function getAndConvertCompletionInfo(
    languageService: TS.LanguageService,
    params: TPICCommonRequestParams
): GetCompletionsResult | null {
    const completionRes = languageService.getCompletionsAtPosition(
        params.fileName,
        params.pos,
        getUserPreferences(params.fileName),
        getFormattingOptions(params.fileName)
    )
    if (!completionRes) {
        return null
    }

    const convertedEntries: GetCompletionsResultEntry[] = []
    for (const entry of completionRes.entries || []) {
        const kindModifiers = parseKindModifier(entry.kindModifiers)
        convertedEntries.push({
            ...entry,
            isColor: kindModifiers.has("color"),
            detail: getScriptKindDetails(entry),
            isDeprecated: kindModifiers.has("deprecated"),
            label: entry.name + (kindModifiers.has("optional") ? "?" : "")
        })
    }
    return { ...completionRes, entries: convertedEntries }
}

export function getAndConvertCompletionDetail(
    languageService: TS.LanguageService,
    lsParams: ResolveCompletionParams
): ScriptCompletionDetail | null {
    const { fileName, pos, entryName, original, source } = lsParams
    const formattingOptions = getFormattingOptions(fileName)
    const userPreferences = getUserPreferences(fileName)
    const detail = languageService.getCompletionEntryDetails(
        fileName,
        pos,
        entryName,
        formattingOptions,
        source,
        userPreferences,
        original
    )
    if (!detail) {
        return null
    }

    const converted: ScriptCompletionDetail = {
        codeActions: [],
        name: detail.name,
        kind: detail.kind,
        kindModifiers: detail.kindModifiers,
        detail: ts.displayPartsToString(detail.displayParts)
    }
    if (detail.tags?.length) {
        converted.tags = detail.tags
    }
    if (detail.codeActions?.length) {
        const resolveImportExtension = getConfig(fileName)?.resolveImportExtension

        detail.codeActions?.forEach(action => {
            const effects: TS.FileTextChanges[] = []
            const currentFileChanges: TextEditWithPosRange[] = []
            if (resolveImportExtension) {
                action.description = action.description.replace(qkExtInImportRE, "$1")
            }
            action.changes.forEach(change => {
                const realPath = getRealPath(change.fileName)
                const currentEffect: TS.FileTextChanges = {
                    textChanges: [],
                    fileName: realPath,
                    isNewFile: change.isNewFile
                }
                change.textChanges.forEach(item => {
                    const sourceStartIndex = getSourceIndex(realPath, item.span.start)
                    if (fileName === change.fileName) {
                        const sourceEndIndex = getSourceIndex(
                            realPath,
                            item.span.start + item.span.length
                        )
                        const isAddImport = addImportTextEditRE.test(item.newText)
                        if (isAddImport && resolveImportExtension) {
                            item.newText = item.newText.replace(qkExtInImportRE, "$1")
                        }
                        if (isAddImport || !isIndexesInvalid(sourceStartIndex, sourceEndIndex)) {
                            currentFileChanges.push({
                                newText: item.newText,
                                range: [sourceStartIndex, sourceEndIndex]
                            })
                        }
                    } else if (!isIndexesInvalid(sourceStartIndex)) {
                        // @ts-ignore
                        currentEffect.textChanges.push({
                            newText: item.newText,
                            span: {
                                start: sourceStartIndex,
                                length: item.span.length
                            }
                        })
                    }
                })
                if (currentEffect.textChanges.length) {
                    effects.push(currentEffect)
                }
            })
            converted.codeActions!.push({
                effects,
                currentFileChanges,
                commands: action.commands,
                description: action.description
            })
        })
    }
    if (detail.documentation) {
        converted.documentation = convertDisplayPartsToPlainTextWithLink(detail.documentation)
    }
    return (converted.detail = converted.detail.replaceAll(`${INTER_NAMESPACE}.`, "")), converted
}

function parseKindModifier(kindModifiers: string | undefined) {
    if (isUndefined(kindModifiers)) {
        kindModifiers = ""
    }
    return new Set(kindModifiers.split(/,|\s+/g))
}

function getScriptKindDetails(entry: TS.CompletionEntry) {
    if (!entry.kindModifiers || entry.kind !== ts.ScriptElementKind.scriptElement) {
        return undefined
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
