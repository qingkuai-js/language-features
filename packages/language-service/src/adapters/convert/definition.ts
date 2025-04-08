import type {
    FindDefinitionResult,
    FindDefinitionResultItem,
    TPICCommonRequestParams
} from "../../../../../types/communication"
import type TS from "typescript"
import type { Range } from "vscode-languageserver-types"

import { lsRange } from "./struct"
import { getRealPath } from "../qingkuai"
import { DEFAULT_RANGE } from "../../../../../shared-util/constant"

export function getAndConvertDefinitions(
    languageService: TS.LanguageService,
    { fileName, pos }: TPICCommonRequestParams
): FindDefinitionResult | null {
    const data = languageService.getDefinitionAndBoundSpan(fileName, pos)
    if (!data) {
        return null
    }

    const originRange = lsRange.fromTextSpan(fileName, data.textSpan) || DEFAULT_RANGE
    const dealtDefinitions = (data.definitions || []).map(item => {
        const range = lsRange.fromTextSpan(item.fileName, item.textSpan)!
        if (item.contextSpan) {
            const contextRange = lsRange.fromTextSpan(item.fileName, item.contextSpan)!
            return {
                fileName: item.fileName,
                targetRange: contextRange,
                targetSelectionRange: range
            }
        }
        return {
            fileName: item.fileName,
            targetRange: range,
            targetSelectionRange: range
        }
    })
    return { range: originRange, definitions: dealtDefinitions }
}

export function getAndConvertTypeDefinitions(
    languageService: TS.LanguageService,
    { fileName, pos }: TPICCommonRequestParams
): FindDefinitionResultItem[] | null {
    const definitions = languageService.getTypeDefinitionAtPosition(fileName, pos)
    if (!definitions?.length) {
        return null
    }

    return definitions.map(definition => {
        const realPath = getRealPath(definition.fileName)
        const range = lsRange.fromTextSpan(realPath, definition.textSpan) || DEFAULT_RANGE

        let contextRange: Range | undefined = undefined
        if (definition.contextSpan) {
            contextRange = lsRange.fromTextSpan(realPath, definition.contextSpan)!
        }

        return {
            fileName: realPath,
            targetRange: range,
            targetSelectionRange: contextRange || range
        }
    })
}
