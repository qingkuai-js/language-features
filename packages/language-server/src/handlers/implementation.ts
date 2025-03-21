import type {
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type { ImplementationHandler } from "../types/handlers"

import { getCompileRes } from "../compile"
import { documents, tpic } from "../state"
import { TPICHandler } from "../../../../shared-util/constant"

export const findImplementation: ImplementationHandler = async ({ textDocument, position }) => {
    const document = documents.get(textDocument.uri)
    if (!document) {
        return null
    }

    const cr = await getCompileRes(document)
    const offset = document.offsetAt(position)
    if (!cr.isPositionFlagSet(offset, "inScript")) {
        return null
    }

    const implementations: FindReferenceResultItem[] | null =
        await tpic.sendRequest<TPICCommonRequestParams>(TPICHandler.FindImplemention, {
            fileName: cr.filePath,
            pos: cr.getInterIndex(offset)
        })
    return implementations?.map(item => {
        return {
            range: item.range,
            uri: `file://${item.fileName}`
        }
    })
}
