import type TS from "typescript"

import type {
    SignatureHelp,
    ParameterInformation,
    SignatureInformation
} from "vscode-languageserver-types"
import type { TypescriptAdapter } from "../adapter"
import type { SignatureHelpParams } from "../../../../../types/communication"

import { debugAssert } from "../../../../../shared-util/assert"
import { convertDisplayPartsToPlainTextWithLink, convertJsDocTagsToMarkdown } from "./documentation"

export function getAndConvertSignatureHelp(
    adapter: TypescriptAdapter,
    params: SignatureHelpParams
): SignatureHelp | null {
    let reason: TS.SignatureHelpTriggerReason | undefined = undefined

    const triggerCharacter = params.triggerCharacter
    const filePath = adapter.getNormalizedPath(params.fileName)
    const languageService = adapter.getDefaultLanguageService(filePath)!
    if (!debugAssert(languageService)) {
        return null
    }

    // 待办：内部工具类不应触发签名帮助，和 hover 一样，查找一种能很好识别内部工具调用的方案

    if (params.isRetrigger) {
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

    const getSignatureHelpRes = languageService?.getSignatureHelpItems(filePath, params.pos, {
        triggerReason: reason
    })
    if (!getSignatureHelpRes) {
        return null
    }

    return {
        signatures: convertSignatures(getSignatureHelpRes.items),
        activeParameter: getActiveParameter(getSignatureHelpRes),
        activeSignature: getSignatureHelpRes.selectedItemIndex
    }
}

function getActiveParameter(info: TS.SignatureHelpItems): number {
    const activeSignature = info.items[info.selectedItemIndex]
    if (activeSignature?.isVariadic) {
        return Math.min(info.argumentIndex, activeSignature.parameters.length - 1)
    }
    return info.argumentIndex
}

function convertSignatures(items: TS.SignatureHelpItem[]): SignatureInformation[] {
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
