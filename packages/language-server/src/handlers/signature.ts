import type { SignatureHelpHandler } from "../types/handlers"
import type { SignatureHelp } from "vscode-languageserver/node"

import { getCompileRes } from "../compile"
import { TPICHandler } from "../../../../shared-util/constant"
import { TPICCommonRequestParams } from "../../../../types/communication"
import { documents, limitedScriptLanguageFeatures, tpic } from "../state"

export const signatureHelp: SignatureHelpHandler = async (params, token) => {
    const document = documents.get(params.textDocument.uri)
    if (!document || limitedScriptLanguageFeatures || token.isCancellationRequested) {
        return null
    }

    const cr = await getCompileRes(document)
    const offset = document.offsetAt(params.position)
    const { isPositionFlagSet } = cr
    if (!isPositionFlagSet(offset, "inScript")) {
        return null
    }

    const signatureHelp = await tpic.sendRequest<TPICCommonRequestParams, SignatureHelp | null>(
        TPICHandler.GetSignatureHelp,
        {
            fileName: cr.filePath,
            pos: cr.getInterIndex(offset)
        }
    )
    if (!signatureHelp) {
        return null
    }

    if (params.context?.activeSignatureHelp) {
        const previouslyActiveSignature =
            params.context.activeSignatureHelp.signatures[
                params.context.activeSignatureHelp.activeSignature!
            ]
        if (previouslyActiveSignature && params.context.isRetrigger) {
            const existingIndex = signatureHelp.signatures.findIndex(s => {
                return s.label === previouslyActiveSignature.label
            })
            if (existingIndex >= 0) {
                signatureHelp.activeSignature = existingIndex
            }
        }
    }

    return signatureHelp
}
