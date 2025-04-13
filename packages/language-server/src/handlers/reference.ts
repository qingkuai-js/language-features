import type {
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type { RealPath } from "../../../../types/common"
import type { ReferenceHandler } from "../types/handlers"

import { CUSTOM_PATH } from "../constants"
import { findReferences } from "qingkuai-language-service"
import { TPICHandler } from "../../../../shared-util/constant"
import { getCompileRes, getCompileResByPath } from "../compile"
import { documents, limitedScriptLanguageFeatures, tpic } from "../state"

export const findReference: ReferenceHandler = async ({ textDocument, position }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested || limitedScriptLanguageFeatures) {
        return null
    }

    const cr = await getCompileRes(document)
    const offset = document.offsetAt(position)
    return findReferences(cr, offset, CUSTOM_PATH, getCompileResByPath, getScriptBlockReferences)
}

async function getScriptBlockReferences(
    fileName: RealPath,
    pos: number
): Promise<FindReferenceResultItem[] | null> {
    return await tpic.sendRequest<TPICCommonRequestParams>(TPICHandler.FindReference, {
        fileName,
        pos
    })
}
