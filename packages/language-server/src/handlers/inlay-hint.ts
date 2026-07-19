import type { InlayHintHandler } from "../types/handlers"
import type { InlayHint } from "vscode-languageserver-types"

import { documents } from "../state"
import { getCompileResult } from "../compile"
import { traverseObject } from "../../../../shared-util/sundry"

export const inlayHint: InlayHintHandler = async ({ textDocument }, token) => {
    if (token.isCancellationRequested) {
        return null
    }

    const result: InlayHint[] = []
    const cr = await getCompileResult(documents.get(textDocument.uri)!)
    if (cr.config?.extensionConfig.inlayHintReactiveStatus) {
        const fullText = cr.document.getText()
        traverseObject(cr.identifierStatusInfo, (_, info) => {
            for (const index of info.inlayIndexes) {
                result.push({
                    paddingLeft: true,
                    label: ":" + info.status,
                    position: cr.document.positionAt(index),
                    paddingRight: !!fullText.charAt(index)?.trim()
                })
            }
        })
    }
    return result
}
