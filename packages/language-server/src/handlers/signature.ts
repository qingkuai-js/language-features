import type { SignatureHelpHandler } from "../types/handlers"
import type { SignatureHelp } from "vscode-languageserver/node"
import type { SignatureHelpParams } from "../../../../types/communication"

import { getCompileResult } from "../compile"
import { getSignatureHelp } from "qingkuai-language-service"
import { TP_HANDLERS } from "../../../../shared-util/constant"
import { documents, limitedScriptLanguageFeatures, tpic } from "../state"

export const signatureHelp: SignatureHelpHandler = async (
    { textDocument, position, context },
    token
) => {
    const document = documents.get(textDocument.uri)
    if (!document || limitedScriptLanguageFeatures || token.isCancellationRequested) {
        return null
    }

    const cr = await getCompileResult(document)
    const offset = document.offsetAt(position)
    return getSignatureHelp(cr, offset, context, getScriptSignatureHelp)
}

async function getScriptSignatureHelp(
    fileName: string,
    pos: number,
    isRetrigger: boolean,
    triggerCharacter: SignatureHelpParams["triggerCharacter"]
): Promise<SignatureHelp | null> {
    return await tpic.sendRequest<SignatureHelpParams>(TP_HANDLERS.GetSignatureHelp, {
        fileName,
        pos,
        isRetrigger,
        triggerCharacter
    })
}
