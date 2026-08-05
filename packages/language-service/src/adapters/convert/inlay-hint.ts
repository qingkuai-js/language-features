import type TS from "typescript"
import type { TypescriptAdapter } from "../adapter"
import type { GetInlayHintResultItem } from "../../../../../types/communication"
import { isIndexesInvalid } from "../../../../../shared-util/qingkuai"

export function getAndConvertInlayHints(
    adapter: TypescriptAdapter,
    fileName: string
): GetInlayHintResultItem[] {
    const filePath = adapter.getNormalizedPath(fileName)
    const languageService = adapter.getDefaultLanguageService(filePath)
    const fileInfo = adapter.service.ensureGetQingkuaiFileInfo(filePath)
    if (!languageService) {
        return []
    }

    const result: GetInlayHintResultItem[] = []
    const tsHints = languageService.provideInlayHints(
        fileName,
        {
            start: 0,
            length: fileInfo.code.length
        },
        adapter.getUserPreferences(filePath)
    )
    for (const hint of tsHints) {
        const sourceIndex = fileInfo.getSourceIndex(hint.position)
        if (isIndexesInvalid(sourceIndex)) {
            continue
        }
        result.push({
            pos: sourceIndex,
            paddingLeft: hint.whitespaceBefore,
            paddingRight: hint.whitespaceAfter,
            kind: adapter.ts.InlayHintKind[hint.kind],
            label: hint.displayParts ? hint.displayParts.map(p => p.text).join("") : hint.text
        })
    }
    return result
}
