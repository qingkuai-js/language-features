import type {
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type { ImplementationHandler } from "../types/handlers"

import { getCompileResult } from "../compile"
import { TP_HANDLERS } from "../../../../shared-util/constant"
import { findImplementations } from "qingkuai-language-service"
import { documents, limitedScriptLanguageFeatures, tpic } from "../state"

export const findImplementation: ImplementationHandler = async ({ textDocument, position }) => {
    const document = documents.get(textDocument.uri)
    if (!document || limitedScriptLanguageFeatures) {
        return null
    }

    const cr = await getCompileResult(document)
    return findImplementations(cr, cr.document.offsetAt(position), getScriptBlockImplementations)
}

async function getScriptBlockImplementations(
    fileName: string,
    pos: number
): Promise<FindReferenceResultItem[] | null> {
    return await tpic.sendRequest<TPICCommonRequestParams>(TP_HANDLERS.FindImplemention, {
        fileName,
        pos
    })
}
