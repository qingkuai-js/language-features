import { TypescriptAdapter } from "../adapter"

import { debugAssert } from "../../../../../shared-util/assert"

export function getNavigationTree(adapter: TypescriptAdapter, fileName: string) {
    const filePath = adapter.getNormalizedPath(fileName)
    const languageService = adapter.getDefaultLanguageService(filePath)!
    if (!languageService) {
        return null
    }

    return languageService.getNavigationTree(filePath)
}
