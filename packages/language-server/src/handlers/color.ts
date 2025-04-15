import type { GetColorPresentations, GetDocumentColor } from "../types/handlers"

import { documents } from "../state"
import { getCompileRes } from "../compile"
import { getDocumentColors as _getDocumentColor } from "qingkuai-language-service"
import { getColorPresentations as _getColorPresentations } from "qingkuai-language-service"

export const getDocumentColor: GetDocumentColor = async ({ textDocument }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }
    return _getDocumentColor(await getCompileRes(document))
}

export const getColorPresentations: GetColorPresentations = async (
    { textDocument, color, range },
    token
) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }
    return _getColorPresentations(await getCompileRes(document), range, color)
}
