import type { CompileResult } from "../../../../types/common"
import type { Color, ColorInformation, Range } from "vscode-languageserver-types"

import { createStyleSheetAndDocument } from "../util/css"

export function getDocumentColors(cr: CompileResult) {
    const result: ColorInformation[] = []
    cr.inputDescriptor.styles.forEach(descriptor => {
        const [languageService, document, _, styleSheet] = createStyleSheetAndDocument(
            cr,
            descriptor.loc.start.index
        )
        result.push(...languageService.findDocumentColors(document, styleSheet))
    })
    return result
}

export function getColorPresentations(cr: CompileResult, range: Range, color: Color) {
    const startOffset = cr.getOffset(range.start)
    const style = createStyleSheetAndDocument(cr, startOffset)
    const [languageService, styleDocument, _, styleSheet] = style
    return languageService.getColorPresentations(styleDocument, styleSheet, color, range)
}
