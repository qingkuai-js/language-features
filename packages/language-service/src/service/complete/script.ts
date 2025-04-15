import type { CompileResult } from "../../../../../types/common"
import type { CompletionData, GetScriptCompletionsFunc } from "../../types/service"
import type { Range, CompletionItem, CompletionList } from "vscode-languageserver-types"

import {
    InsertTextFormat,
    CompletionItemTag,
    CompletionItemKind
} from "vscode-languageserver-types"
import { util } from "qingkuai/compiler"
import { identifierRE } from "../../regular"
import { findAttribute, findNodeAt } from "../../util/qingkuai"
import { INVALID_COMPLETION_TEXT_LABELS } from "../../constants"
import { INTER_NAMESPACE } from "../../../../../shared-util/constant"
import { isIndexesInvalid } from "../../../../../shared-util/qingkuai"

export async function getAndProcessScriptBlockCompletions(
    cr: CompileResult,
    offset: number,
    trigger: string,
    getCompletions: GetScriptCompletionsFunc
): Promise<CompletionList | null> {
    const response = await getCompletions(cr.filePath, cr.getInterIndex(offset))
    if (!response) {
        return null
    }

    let completionItems: CompletionItem[] = []
    const unsetTriggerCharacters = new Set<string>()
    const currentNode = findNodeAt(cr.templateNodes, offset)
    const attribute = currentNode ? findAttribute(offset, currentNode) : undefined

    // 如果当前处于#for指令的第一个标识符范围内，禁止逗号作为commit character
    if (attribute?.key.raw === "#for") {
        const m = attribute.value.loc.start.index + util.findOutOfComment(attribute.value.raw, /\S/)
        if (
            m !== -1 &&
            m <= offset &&
            identifierRE.test(cr.inputDescriptor.source.slice(m, offset))
        ) {
            unsetTriggerCharacters.add(",")
        }
    }

    let defaultEditRange: Range | undefined = undefined
    if (response.optionalReplacementSpan) {
        const { start, length } = response.optionalReplacementSpan
        defaultEditRange = cr.getRange(
            cr.getSourceIndex(start),
            cr.getSourceIndex(start + length, true)
        )
    }

    response.entries.forEach(entry => {
        const insertText = entry.insertText || entry.name
        const data: CompletionData = {
            kind: "script",
            original: entry.data,
            source: entry.source,
            entryName: entry.name,
            fileName: cr.filePath,
            pos: cr.getInterIndex(offset)
        }
        const currentItem: CompletionItem = {
            data,
            insertText,
            detail: entry.detail,
            sortText: entry.sortText,
            filterText: insertText,
            commitCharacters: entry.commitCharacters,
            kind: convertTsCompletionKind(entry.kind),
            label: entry.label || (entry.insertText ?? "")
        }
        if (entry.isRecommended) {
            currentItem.preselect = true
        }
        if (entry.source) {
            currentItem.labelDetails = {
                description: entry.source
            }
        }
        if (entry.isColor) {
            currentItem.kind = CompletionItemKind.Color
        }
        if (entry.isDeprecated) {
            currentItem.tags = [CompletionItemTag.Deprecated]
        }
        if (
            response.isNewIdentifierLocation ||
            currentItem.kind === CompletionItemKind.Text ||
            currentItem.kind === CompletionItemKind.Constant
        ) {
            currentItem.commitCharacters = undefined
        }
        if (entry.isSnippet) {
            currentItem.insertTextFormat = InsertTextFormat.Snippet
        }
        if (entry.replacementSpan) {
            const { start, length } = entry.replacementSpan
            const se = cr.getSourceIndex(start + length, true)
            const ss = cr.getSourceIndex(start)
            if (!isIndexesInvalid(ss, se)) {
                currentItem.textEdit = {
                    newText: insertText,
                    range: cr.getRange(ss, se)
                }
            }
        } else if (defaultEditRange) {
            currentItem.textEdit = {
                newText: insertText,
                range: defaultEditRange
            }
        }
        completionItems.push(currentItem)
    })

    // 过滤无效的补全建议
    completionItems = completionItems.filter(item => {
        if (item.label === INTER_NAMESPACE) {
            return false
        }
        if (
            item.kind === CompletionItemKind.Text &&
            INVALID_COMPLETION_TEXT_LABELS.has(item.label)
        ) {
            return false
        }
        if (/['"`]/.test(trigger)) {
            return item.kind === CompletionItemKind.Constant
        }
        if (!INVALID_COMPLETION_TEXT_LABELS.has(item.label)) {
            return true
        }

        const preContent = cr.code.slice(0, cr.getInterIndex(offset))
        return !new RegExp(`${INTER_NAMESPACE}\\.\\s*`).test(preContent)
    })

    return {
        items: completionItems,
        isIncomplete: !!response.isIncomplete,
        itemDefaults: {
            commitCharacters: (response.defaultCommitCharacters || []).filter(char => {
                return !unsetTriggerCharacters.has(char)
            })
        }
    }
}

// 将ts补全建议的kind转换为LSP需要的kind
function convertTsCompletionKind(kind: string) {
    switch (kind) {
        case "keyword":
        case "primitive type":
            return CompletionItemKind.Keyword

        case "var":
        case "let":
        case "const":
        case "alias":
        case "local var":
        case "parameter":
            return CompletionItemKind.Variable

        case "getter":
        case "setter":
        case "property":
            return CompletionItemKind.Field

        case "function":
        case "local function":
            return CompletionItemKind.Function

        case "call":
        case "index":
        case "method":
        case "construct":
            return CompletionItemKind.Method

        case "enum":
            return CompletionItemKind.Enum

        case "enum member":
            return CompletionItemKind.EnumMember

        case "module":
        case "external module name":
            return CompletionItemKind.Module

        case "color":
            return CompletionItemKind.Color

        case "type":
        case "class":
            return CompletionItemKind.Class

        case "interface":
            return CompletionItemKind.Interface

        case "warning":
            return CompletionItemKind.Text

        case "script":
            return CompletionItemKind.File

        case "directory":
            return CompletionItemKind.Folder

        case "string":
            return CompletionItemKind.Constant

        default:
            return CompletionItemKind.Property
    }
}
