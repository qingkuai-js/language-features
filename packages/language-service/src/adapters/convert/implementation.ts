import {
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../../types/communication"
import type TS from "typescript"

import { lsRange } from "./struct"

export function findAndConvertImplementations(
    languageService: TS.LanguageService,
    { fileName, pos }: TPICCommonRequestParams
): FindReferenceResultItem[] | null {
    const implementations = languageService.getImplementationAtPosition(fileName, pos)
    if (!implementations) {
        return null
    }

    const result: FindReferenceResultItem[] = []
    for (const { fileName, textSpan } of implementations) {
        const range = lsRange.fromTextSpan(fileName, textSpan)
        range && result.push({ range, fileName })
    }
    return result
}
