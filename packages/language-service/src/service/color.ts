import type { CompileResult } from "../../../../types/common"
import type { Color, ColorInformation, Range } from "vscode-languageserver-types"

import { createStyleSheetAndDocument, cssLanguageService } from "../util/css"

export function getDocumentColor(cr: CompileResult) {
    const result: ColorInformation[] = []
    cr.inputDescriptor.styles.forEach(descriptor => {
        const [document, _, styleSheet] = createStyleSheetAndDocument(
            cr,
            descriptor.loc.start.index
        )!
        result.push(...cssLanguageService.findDocumentColors(document, styleSheet))
    })
    return result
}

export function getColorPresentations(cr: CompileResult, range: Range, color: Color) {
    const startOffset = cr.getOffset(range.start)
    const style = createStyleSheetAndDocument(cr, startOffset)
    if (!style) {
        return null
    }

    const [styleDocument, _, styleSheet] = style
    return cssLanguageService.getColorPresentations(styleDocument, styleSheet, color, range)
}
