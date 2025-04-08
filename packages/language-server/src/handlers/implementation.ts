import type {
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type { RealPath } from "../../../../types/common"
import type { ImplementationHandler } from "../types/handlers"

import { getCompileRes } from "../compile"
import { TPICHandler } from "../../../../shared-util/constant"
import { findImplementations } from "qingkuai-language-service"
import { documents, limitedScriptLanguageFeatures, tpic } from "../state"

export const findImplementation: ImplementationHandler = async ({ textDocument, position }) => {
    const document = documents.get(textDocument.uri)
    if (!document || limitedScriptLanguageFeatures) {
        return null
    }

    const cr = await getCompileRes(document)
    return findImplementations(cr, cr.getOffset(position), getScriptBlockImplementations)
}

async function getScriptBlockImplementations(
    fileName: RealPath,
    pos: number
): Promise<FindReferenceResultItem[] | null> {
    return await tpic.sendRequest<TPICCommonRequestParams>(TPICHandler.FindImplemention, {
        fileName,
        pos
    })
}
