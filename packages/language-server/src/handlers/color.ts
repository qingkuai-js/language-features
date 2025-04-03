import type { GetColorPresentations, GetDocumentColor } from "../types/handlers"

import { getCompileRes } from "../compile"
import { ColorInformation } from "vscode-languageserver"
import { cssLanguageService, documents } from "../state"
import { createStyleSheetAndDocument } from "../util/qingkuai"

export const getDocumentColor: GetDocumentColor = async ({ textDocument }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    const result: ColorInformation[] = []
    const cr = await getCompileRes(document)
    cr.inputDescriptor.styles.forEach(descriptor => {
        const [document, _, styleSheet] = createStyleSheetAndDocument(
            cr,
            descriptor.loc.start.index
        )!
        result.push(...cssLanguageService.findDocumentColors(document, styleSheet))
    })
    return result
}

export const getColorPresentations: GetColorPresentations = async (
    { textDocument, color, range },
    token
) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    const cr = await getCompileRes(document)
    const startOffset = document.offsetAt(range.start)
    const style = createStyleSheetAndDocument(cr, startOffset)
    if (!style) {
        return null
    }

    const [styleDocument, _, styleSheet] = style
    return cssLanguageService.getColorPresentations(styleDocument, styleSheet, color, range)
}
