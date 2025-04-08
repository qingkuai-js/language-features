import type {
    SignatureHelp,
    ParameterInformation,
    SignatureInformation
} from "vscode-languageserver-types"
import type TS from "typescript"
import type { SignatureHelpParams } from "../../../../../types/communication"

import { ts } from "../state"
import { findAncestorUntil, getNodeAt } from "../ts-ast"
import { INTER_NAMESPACE } from "../../../../../shared-util/constant"
import { convertDisplayPartsToPlainTextWithLink, convertJsDocTagsToMarkdown } from "./typescript"

export function getAndConvertSignatureHelp(
    languageService: TS.LanguageService,
    lsParams: SignatureHelpParams
): SignatureHelp | null {
    let reason: TS.SignatureHelpTriggerReason | undefined = undefined
    const { fileName, pos, isRetrigger, triggerCharacter } = lsParams
    const sourceFile = languageService.getProgram()?.getSourceFile(fileName)

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
    const getSignatureHelpRes = languageService?.getSignatureHelpItems(fileName, pos, options)
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
