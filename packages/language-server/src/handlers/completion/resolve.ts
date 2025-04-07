import type {
    ResolveCompletionParams,
    ResolveCompletionResult
} from "../../../../../types/communication"
import type { NumNum } from "../../../../../types/common"
import type { CompletionData } from "../../types/service"
import type { ResolveCompletionHandler } from "../../types/handlers"

import { URI } from "vscode-uri"
import { getCompileRes } from "../../compile"
import { TextEdit } from "vscode-languageserver"
import { parseTemplate } from "qingkuai/compiler"
import { formatImportStatement } from "../../util/qingkuai"
import { isString } from "../../../../../shared-util/assert"
import { TPICHandler } from "../../../../../shared-util/constant"
import { isIndexesInvalid } from "../../../../../shared-util/qingkuai"
import { documents, limitedScriptLanguageFeatures, tpic } from "../../state"

export const resolveCompletion: ResolveCompletionHandler = async (item, token) => {
    if (
        !isString(item.data?.kind) ||
        limitedScriptLanguageFeatures ||
        token.isCancellationRequested
    ) {
        return item
    }

    const data: CompletionData = item.data
    switch (data.kind) {
        case "emmet": {
            const textEdit = item.textEdit!
            const newTextArr = textEdit.newText.split("")
            parseTemplate(textEdit.newText).forEach(node => {
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
            item.documentation = item.textEdit?.newText.replace(/\$\{\d+\}/g, "|")
            break
        }

        case "script": {
            const document = documents.get(URI.file(data.fileName).toString())!
            const { getSourceIndex, getRange, inputDescriptor, config } =
                await getCompileRes(document)
            const res: ResolveCompletionResult = await tpic.sendRequest<ResolveCompletionParams>(
                TPICHandler.ResolveCompletionItem,
                data
            )
            if (res.detail) {
                item.detail = res.detail
            }
            if (res.documentation) {
                item.documentation = {
                    kind: "markdown",
                    value: res.documentation
                }
            }
            if (data.insertText) {
                if (!item.textEdit) {
                    item.insertText = data.insertText
                } else {
                    item.textEdit.newText = data.insertText
                }
            }
            if (res.textEdits) {
                const additionalTextEdits: TextEdit[] = []
                for (const item of res.textEdits) {
                    let sourcePosRange: NumNum = [
                        getSourceIndex(item.start),
                        getSourceIndex(item.end, true)
                    ]
                    if (item.newText.trimStart().startsWith("import")) {
                        sourcePosRange = Array(2).fill(
                            inputDescriptor.script.loc.start.index
                        ) as NumNum
                        item.newText = formatImportStatement(
                            item.newText.trim(),
                            inputDescriptor.source,
                            sourcePosRange,
                            config.prettierConfig
                        )
                    }
                    if (!isIndexesInvalid(...sourcePosRange)) {
                        additionalTextEdits.push({
                            newText: item.newText,
                            range: getRange(...sourcePosRange)
                        })
                    }
                }
                if (additionalTextEdits.length) {
                    item.additionalTextEdits = additionalTextEdits
                }
            }
        }
    }
    return item
}
