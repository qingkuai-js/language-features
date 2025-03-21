import type {
    SignatureHelp,
    ParameterInformation,
    SignatureInformation
} from "vscode-languageserver/node"
import { SignatureHelpItem, SignatureHelpItems } from "typescript"
import type { TPICCommonRequestParams } from "../../../../types/communication"

import {
    convertJsDocTagsToMarkdown,
    getDefaultLanguageServiceByFileName,
    convertDisplayPartsToPlainTextWithLink
} from "../util/typescript"
import { server } from "../state"
import { TPICHandler } from "../../../../shared-util/constant"

export function attachGetSignatureHelp() {
    server.onRequest<TPICCommonRequestParams, SignatureHelp | null>(
        TPICHandler.GetSignatureHelp,
        ({ fileName, pos }) => {
            const languageService = getDefaultLanguageServiceByFileName(fileName)
            const getSignatureHelpRes = languageService?.getSignatureHelpItems(
                fileName,
                pos,
                undefined
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
