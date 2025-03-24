import type {
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type { ImplementationHandler } from "../types/handlers"

import { URI } from "vscode-uri"
import { getCompileRes } from "../compile"
import { TPICHandler } from "../../../../shared-util/constant"
import { documents, limitedScriptLanguageFeatures, tpic } from "../state"

export const findImplementation: ImplementationHandler = async ({ textDocument, position }) => {
    const document = documents.get(textDocument.uri)
    if (!document || limitedScriptLanguageFeatures) {
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
            uri: URI.file(item.fileName).toString()
        }
    })
}
