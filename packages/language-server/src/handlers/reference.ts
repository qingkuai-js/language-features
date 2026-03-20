import type {
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type { ReferenceHandler } from "../types/handlers"

import { getCompileResult } from "../compile"
import { findReferences } from "qingkuai-language-service"
import { TP_HANDLERS } from "../../../../shared-util/constant"
import { documents, limitedScriptLanguageFeatures, tpic } from "../state"

export const findReference: ReferenceHandler = async ({ textDocument, position }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested || limitedScriptLanguageFeatures) {
        return null
    }
    return findReferences(
        await getCompileResult(document),
        document.offsetAt(position),
        getScriptBlockReferences
    )
}

async function getScriptBlockReferences(
    fileName: string,
    pos: number
): Promise<FindReferenceResultItem[] | null> {
    return await tpic.sendRequest<TPICCommonRequestParams>(TP_HANDLERS.FindReference, {
        fileName,
        pos
    })
}
