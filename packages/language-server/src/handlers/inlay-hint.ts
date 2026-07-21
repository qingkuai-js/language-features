import type { InlayHintHandler } from "../types/handlers"
import type { GetInlayHintResultItem } from "../../../../types/communication"

import { documents, tpic } from "../state"
import { getCompileResult } from "../compile"
import { getInlayHint } from "qingkuai-language-service"
import { TP_HANDLERS } from "../../../../shared-util/constant"

export const inlayHint: InlayHintHandler = async ({ textDocument }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    const cr = await getCompileResult(document)
    return getInlayHint(cr, getScriptInlayHints)
}

function getScriptInlayHints(fileName: string) {
    return tpic.sendRequest<string, GetInlayHintResultItem[]>(TP_HANDLERS.GetInlayHint, fileName)
}
