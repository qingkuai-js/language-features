import type {
    SignatureHelp,
    ParameterInformation,
    SignatureInformation
} from "vscode-languageserver/node"
import type { SignatureHelpParams } from "../../../../types/communication"
import type { SignatureHelpItem, SignatureHelpItems, SignatureHelpTriggerReason } from "typescript"

import {
    getNodeAt,
    convertJsDocTagsToMarkdown,
    getDefaultLanguageServiceByFileName,
    convertDisplayPartsToPlainTextWithLink
} from "../util/typescript"
import { server, ts } from "../state"
import { findAncestorUntil } from "../util/ast"
import { INTER_NAMESPACE, TPICHandler } from "../../../../shared-util/constant"

export function attachGetSignatureHelp() {
    server.onRequest<SignatureHelpParams, SignatureHelp | null>(
        TPICHandler.GetSignatureHelp,
        ({ fileName, pos, isRetrigger, triggerCharacter }) => {
            let reason: SignatureHelpTriggerReason | undefined = undefined
            const languageService = getDefaultLanguageServiceByFileName(fileName)
            const sourceFile = languageService?.getProgram()?.getSourceFile(fileName)

            // __c__命名空间中的方法调用不触发签名帮助
            if (sourceFile) {
                const node = getNodeAt(sourceFile, pos)
                const callee = node && findAncestorUntil(node, ts.SyntaxKind.CallExpression)
                if (callee?.getText().startsWith(INTER_NAMESPACE)) {
                    return null
                }
            }

            if (isRetrigger) {
                reason = {
                    kind: "retrigger",
                    triggerCharacter
                }
            } else if (triggerCharacter) {
                reason = {
                    kind: "characterTyped",
                    triggerCharacter
                }
            } else {
                reason = {
                    kind: "invoked"
                }
            }

            const options = { triggerReason: reason }
            const getSignatureHelpRes = languageService?.getSignatureHelpItems(
                fileName,
                pos,
                options
            )
            if (!getSignatureHelpRes) {
                return null
            }

            return {
                signatures: convertSignatures(getSignatureHelpRes.items),
                activeParameter: getActiveParameter(getSignatureHelpRes),
                activeSignature: getSignatureHelpRes.selectedItemIndex
            }
        }
    )
}

function getActiveParameter(info: SignatureHelpItems): number {
    const activeSignature = info.items[info.selectedItemIndex]
    if (activeSignature?.isVariadic) {
        return Math.min(info.argumentIndex, activeSignature.parameters.length - 1)
    }
    return info.argumentIndex
}

function convertSignatures(items: SignatureHelpItem[]): SignatureInformation[] {
    return items.map(item => {
        const signatureLabelParts: string[] = [
            convertDisplayPartsToPlainTextWithLink(item.prefixDisplayParts)
        ]
        const separate = convertDisplayPartsToPlainTextWithLink(item.separatorDisplayParts)
        const parameters = item.parameters.map((p, i) => {
            const parameterLabel = convertDisplayPartsToPlainTextWithLink(p.displayParts)
            const documentation = convertDisplayPartsToPlainTextWithLink(p.documentation)
            signatureLabelParts.push(
                parameterLabel,
                i === item.parameters.length - 1 ? "" : separate
            )

            const parameter: ParameterInformation = { label: parameterLabel }
            if (documentation) {
                parameter.documentation = {
                    kind: "markdown",
                    value: documentation
                }
            }
            return parameter
        })
        signatureLabelParts.push(convertDisplayPartsToPlainTextWithLink(item.suffixDisplayParts))

        const signature: SignatureInformation = { label: signatureLabelParts.join(""), parameters }
        const documentation =
            convertDisplayPartsToPlainTextWithLink(item.documentation) +
            convertJsDocTagsToMarkdown(item.tags.filter(t => t.name !== "param"))
        if (documentation) {
            signature.documentation = {
                kind: "markdown",
                value: documentation
            }
        }
        return signature
    })
}
