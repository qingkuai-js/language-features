import type { SignatureHelpHandler } from "../types/handlers"
import type { SignatureHelp } from "vscode-languageserver/node"
import type { SignatureHelpParams } from "../../../../types/communication"

import { getCompileRes } from "../compile"
import { TPICHandler } from "../../../../shared-util/constant"
import { documents, limitedScriptLanguageFeatures, tpic } from "../state"

export const signatureHelp: SignatureHelpHandler = async (
    { textDocument, position, context },
    token
) => {
    const document = documents.get(textDocument.uri)
    if (!document || limitedScriptLanguageFeatures || token.isCancellationRequested) {
        return null
    }

    const cr = await getCompileRes(document)
    const offset = document.offsetAt(position)
    const { isPositionFlagSet } = cr
    if (!isPositionFlagSet(offset, "inScript")) {
        return null
    }

    const signatureHelp = await tpic.sendRequest<SignatureHelpParams, SignatureHelp | null>(
        TPICHandler.GetSignatureHelp,
        {
            fileName: cr.filePath,
            pos: cr.getInterIndex(offset),
            isRetrigger: !!context?.isRetrigger,
            triggerCharacter: context?.triggerCharacter as any
        }
    )
    if (!signatureHelp) {
        return null
    }

    if (context?.activeSignatureHelp) {
        const previouslyActiveSignature =
            context.activeSignatureHelp.signatures[context.activeSignatureHelp.activeSignature!]
        if (previouslyActiveSignature && context.isRetrigger) {
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
