import type {
    CompletionData,
    TextEditWithPosRange,
    GetCompileResultFunc,
    GetScriptCompletionDetailFunc
} from "../../types/service"
import type { CompletionItem, TextEdit } from "vscode-languageserver-types"

import { CompletionImportTextEditRE } from "../../regular"
import { formatImportStatement } from "../../util/qingkuai"

export async function resolveScriptBlockCompletion(
    item: CompletionItem,
    getCompileRes: GetCompileResultFunc,
    getScriptCompletionDetail: GetScriptCompletionDetailFunc
): Promise<CompletionItem> {
    const data: CompletionData = item.data
    const cr = await getCompileRes(data.fileName)
    const completionDetail = await getScriptCompletionDetail(item)
    if (!completionDetail) {
        return item
    }

    const scriptStartIndex = cr.scriptDescriptor.loc.start.index
    const [detailSections, textEdits]: [string[], TextEditWithPosRange[]] = [[], []]
    if (completionDetail?.codeActions?.length) {
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
            if (CompletionImportTextEditRE.test(item.newText)) {
                const addImportIndex = Math.max(0, scriptStartIndex)
                item.range = [addImportIndex, addImportIndex]
                item.newText = formatImportStatement(
                    item.newText.trim(),
                    cr.document.getText(),
                    item.range,
                    data.projectKind,
                    cr.config?.prettierConfig
                )
            }
            additionalTextEdits.push({
                newText: item.newText,
                range: cr.getVscodeRange(...item.range)
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
