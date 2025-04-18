import type { CompileResult } from "../../../../types/common"
import type { SignatureHelp } from "vscode-languageserver-types"
import type { SignatureHelpContext } from "vscode-languageserver"
import type { GetScriptBlockSignatureFunc } from "../types/service"

export async function getSignatureHelp(
    cr: CompileResult,
    offset: number,
    context: SignatureHelpContext | undefined,
    getScriptSignature: GetScriptBlockSignatureFunc
): Promise<SignatureHelp | null> {
    if (!cr.isPositionFlagSet(offset, "inScript")) {
        return null
    }

    const signatureHelp = await getScriptSignature(
        cr.filePath,
        cr.getInterIndex(offset),
        Boolean(context?.isRetrigger),
        context?.triggerCharacter as any
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
