import type { RealPath } from "../../../../types/common"
import type { SignatureHelpHandler } from "../types/handlers"
import type { SignatureHelp } from "vscode-languageserver/node"
import type { SignatureHelpParams } from "../../../../types/communication"

import { getCompileRes } from "../compile"
import { getSignatureHelp } from "qingkuai-language-service"
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
    return getSignatureHelp(cr, offset, context, getScriptSignatureHelp)
}

async function getScriptSignatureHelp(
    fileName: RealPath,
    pos: number,
    isRetrigger: boolean,
    triggerCharacter?: string
): Promise<SignatureHelp | null> {
    return await tpic.sendRequest<SignatureHelpParams>(TPICHandler.GetSignatureHelp, {
        fileName,
        pos,
        isRetrigger,
        triggerCharacter
    })
}
