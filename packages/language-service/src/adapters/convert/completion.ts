import type TS from "typescript"
import type { AdapterTsProject } from "../../types/adapter"

import type {
    GetCompletionsParms,
    GetCompletionsResult,
    ResolveCompletionParams,
    GetCompletionsResultEntry
} from "../../../../../types/communication"
import type { TypescriptAdapter } from "../adapter"
import type { ScriptCompletionDetail, TextEditWithPosRange } from "../../types/service"

import { ts } from "../state"
import { constants as qingkuaiConstants } from "qingkuai/compiler"
import { isIndexesInvalid } from "../../../../../shared-util/qingkuai"
import { convertDisplayPartsToPlainTextWithLink } from "./documentation"
import { CompletionImportTextEditRE, qkExtInImportRE } from "../../regular"
import { debugAssert, isQingkuaiFileName, isUndefined } from "../../../../../shared-util/assert"
import { INVALID_COMPLETION_TEXT_LABELS, LSU_AND_DOT, SCRIPT_EXTENSIONS } from "../../constants"

export function getAndConvertCompletionInfo(
    adapter: TypescriptAdapter,
    params: GetCompletionsParms
): GetCompletionsResult | null {
    const filePath = adapter.getNormalizedPath(params.fileName)
    const languageService = adapter.getDefaultLanguageService(filePath)!
    debugAssert(!!languageService)

    const completionRes = languageService.getCompletionsAtPosition(
        filePath,
        params.pos,
        {
            ...adapter.getUserPreferences(filePath),
            triggerKind: params.triggerKind,
            includeInsertTextCompletions: true,
            triggerCharacter: params.triggerCharacter as any
        },
        adapter.getFormattingOptions(filePath)
    )
    if (!completionRes) {
        return null
    }

    const convertedEntries: GetCompletionsResultEntry[] = []
    for (const entry of completionRes.entries || []) {
        const kindModifiers = parseKindModifier(entry.kindModifiers)
        convertedEntries.push({
            ...entry,
            name: entry.name,
            isColor: kindModifiers.has("color"),
            detail: getScriptKindDetails(entry),
            isDeprecated: kindModifiers.has("deprecated"),
            label: entry.name + (kindModifiers.has("optional") ? "?" : "")
        })
    }
    return { ...completionRes, entries: convertedEntries }
}

export function getAndConvertCompletionDetail(
    adapter: TypescriptAdapter,
    lsParams: ResolveCompletionParams
): ScriptCompletionDetail | null {
    const { fileName, pos, entryName, original, source } = lsParams
    const filePath = adapter.getNormalizedPath(fileName)
    const languageService = adapter.getDefaultLanguageService(filePath)!
    debugAssert(!!languageService)

    const userPreferences = adapter.getUserPreferences(fileName)
    const formattingOptions = adapter.getFormattingOptions(fileName)
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
        const resolveImportExtension = adapter.getQingkuaiConfig(fileName)?.resolveImportExtension

        detail.codeActions?.forEach(action => {
            const effects: TS.FileTextChanges[] = []
            const currentFileChanges: TextEditWithPosRange[] = []
            if (resolveImportExtension) {
                action.description = action.description.replace(qkExtInImportRE, "$1")
            }
            action.changes.forEach(change => {
                const changeFilePath = adapter.getNormalizedPath(change.fileName)
                const changeFileInfo = adapter.service.ensureGetQingkuaiFileInfo(changeFilePath)
                const currentEffect: TS.FileTextChanges = {
                    textChanges: [],
                    fileName: changeFilePath,
                    isNewFile: change.isNewFile
                }
                change.textChanges.forEach(item => {
                    const sourceStartIndex = changeFileInfo.getSourceIndex(item.span.start)
                    if (fileName === change.fileName) {
                        const sourceEndIndex = changeFileInfo.getSourceIndex(
                            item.span.start + item.span.length
                        )
                        const willEditImport = CompletionImportTextEditRE.test(item.newText)
                        if (willEditImport && resolveImportExtension) {
                            item.newText = item.newText.replace(qkExtInImportRE, "$1")
                        }
                        if (willEditImport || !isIndexesInvalid(sourceStartIndex, sourceEndIndex)) {
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
    return converted
}

// 防止 qingkuai 语言服务内部类型/工具方法出现在补全提示中
export function proxyGetCompletionsAtPositionToConvert(
    adapter: TypescriptAdapter,
    project: AdapterTsProject
) {
    const languageService = project.getLanguageService()
    const getCompletionsAtPosition = languageService.getCompletionsAtPosition
    languageService.getCompletionsAtPosition = (
        fileName,
        position,
        preference,
        formattingOptions
    ) => {
        const originalResult = getCompletionsAtPosition.call(
            languageService,
            fileName,
            position,
            preference,
            formattingOptions
        )
        if (originalResult?.entries) {
            originalResult.entries = originalResult.entries.filter(entry => {
                const sourceFileName = entry.data?.fileName
                if (sourceFileName && isQingkuaiFileName(sourceFileName)) {
                    entry.name =
                        adapter.service.ensureGetQingkuaiFileInfo(sourceFileName).componentName
                }
                if (entry.name === qingkuaiConstants.LANGUAGE_SERVICE_UTIL) {
                    return false
                }
                if (INVALID_COMPLETION_TEXT_LABELS.has(entry.name)) {
                    const entryDetail = languageService.getCompletionEntryDetails(
                        fileName,
                        position,
                        entry.name,
                        formattingOptions,
                        entry.source,
                        preference,
                        entry.data
                    )
                    return !entryDetail?.displayParts.some(part => {
                        return part.text === qingkuaiConstants.LANGUAGE_SERVICE_UTIL
                    })
                }
                if (!entry.source) {
                    return true
                }
                if (/\.\//.test(entry.source)) {
                    const dirPath = adapter.path.dir(fileName)
                    const sourcePath = adapter.path.resolve(dirPath, entry.source)
                    return !sourcePath.startsWith(adapter.typeDeclarationFilePath)
                }
                return entry.source !== "qingkuai/internal"
            })
        }
        return originalResult
    }
}

// 去除组件标识符的补全提示中的内部类型工具描述（__qk__lsu）
export function proxyGetCompletionEntryDetailsToConvert(
    _: TypescriptAdapter,
    project: AdapterTsProject
) {
    const languageService = project.getLanguageService()
    const getCompletionEntryDetails = languageService.getCompletionEntryDetails
    languageService.getCompletionEntryDetails = (...args) => {
        const originalRet = getCompletionEntryDetails.apply(languageService, args)
        if (originalRet && args[6]?.fileName && isQingkuaiFileName(args[6].fileName)) {
            originalRet.tags?.forEach(tag => {
                tag.text?.forEach(item => {
                    item.text = item.text.replaceAll(LSU_AND_DOT, "")
                })
            })
            for (let i = 0; i < originalRet.displayParts.length; i++) {
                if (originalRet.displayParts[i].text !== qingkuaiConstants.LANGUAGE_SERVICE_UTIL) {
                    continue
                }
                if (originalRet.displayParts[i + 1].text === ".") {
                    originalRet.displayParts[i + 1].text = ""
                }
                originalRet.displayParts[i].text = ""
            }
        }
        return originalRet
    }
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
