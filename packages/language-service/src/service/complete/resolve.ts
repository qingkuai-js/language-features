import type {
    TextEditWithPosRange,
    GetCompileResultFunc,
    GetScriptCompletionDetailFunc
} from "../../types/service"
import type { CompletionItem, TextEdit } from "vscode-languageserver-types"

import { parseTemplate } from "qingkuai/compiler"
import { addImportTextEditRE } from "../../regular"
import { formatImportStatement } from "../../util/qingkuai"
import { isString } from "../../../../../shared-util/assert"

export function resolveEmmetCompletion(item: CompletionItem) {
    if (!isString(item.data?.kind)) {
        return item
    }

    const textEdit = item.textEdit!
    const newTextArr = textEdit.newText.split("")
    parseTemplate(textEdit.newText, true).forEach(node => {
        let sizesitCount = 0
        node.attributes.forEach(attr => {
            if (attr.quote && !attr.value.raw) {
                sizesitCount++
            }
        })
        node.attributes.forEach(attr => {
            if (attr.quote !== "none" && /[!@#&]/.test(attr.key.raw[0])) {
                newTextArr[attr.value.loc.end.index] = "}"
                newTextArr[attr.value.loc.start.index - 1] = "{"
            }
        })
    })
    textEdit.newText = newTextArr.join("")
    return (item.documentation = item.textEdit?.newText.replace(/\$\{\d+\}/g, "|")), item
}

export async function resolveScriptBlockCompletion(
    item: CompletionItem,
    getCompileRes: GetCompileResultFunc,
    getScriptCompletionDetail: GetScriptCompletionDetailFunc
): Promise<CompletionItem> {
    const cr = await getCompileRes(item.data.fileName)
    const completionDetail = await getScriptCompletionDetail(item)
    if (!completionDetail) {
        return item
    }

    const scriptStartIndex = cr.inputDescriptor.script.loc.start.index
    const [detailSections, textEdits]: [string[], TextEditWithPosRange[]] = [[], []]
    if (completionDetail?.codeActions) {
        let hasRemainingCommandOrEdits = false
        for (let i = 0; i < completionDetail.codeActions.length; i++) {
            const action = completionDetail.codeActions[i]
            if (action.effects || action.commands?.length) {
                hasRemainingCommandOrEdits = true
            }
            detailSections.push(action.description)
            textEdits.push(...action.currentFileChanges)
        }
        if (hasRemainingCommandOrEdits) {
            item.command = {
                title: "",
                arguments: [
                    cr.filePath,
                    completionDetail.codeActions.map(action => {
                        return {
                            ...action,
                            changes: action.effects
                        }
                    })
                ],
                command: "_typescript.applyCompletionCodeAction"
            }
        }
        detailSections.push("\n\n")
    }
    if (textEdits.length) {
        const additionalTextEdits: TextEdit[] = []
        for (const item of textEdits) {
            if (addImportTextEditRE.test(item.newText)) {
                item.range = [scriptStartIndex, scriptStartIndex]
                item.newText = formatImportStatement(
                    item.newText.trim(),
                    cr.inputDescriptor.source,
                    item.range,
                    cr.config.prettierConfig
                )
            }
            additionalTextEdits.push({
                newText: item.newText,
                range: cr.getRange(...item.range)
            })
        }
        if (additionalTextEdits.length) {
            item.additionalTextEdits = additionalTextEdits
        }
    }
    if (completionDetail.detail) {
        item.detail = completionDetail.detail
    }
    if (completionDetail.documentation) {
        item.documentation = {
            kind: "markdown",
            value: completionDetail.documentation
        }
    }
    if (completionDetail) {
        detailSections.push(completionDetail.detail)
    }
    return { ...item, detail: detailSections.length ? detailSections.join("") : undefined }
}
