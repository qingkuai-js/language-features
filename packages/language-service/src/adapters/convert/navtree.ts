import type TS from "typescript"

import { TypescriptAdapter } from "../adapter"

export function getNavigationTree(
    adapter: TypescriptAdapter,
    fileName: string
): TS.NavigationTree | null {
    const filePath = adapter.getNormalizedPath(fileName)
    const languageService = adapter.getDefaultLanguageService(filePath)!
    if (!languageService) {
        return null
    }

    return languageService.getNavigationTree(filePath)
}
