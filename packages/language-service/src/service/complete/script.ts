import type { CompileResult } from "../../../../../types/common"
import type { CompletionTriggerKind } from "vscode-languageserver"
import type { ProjectKind } from "../../../../../shared-util/constant"
import type { CompletionData, GetScriptCompletionsFunc } from "../../types/service"
import type { Range, CompletionItem, CompletionList } from "vscode-languageserver-types"

import {
    InsertTextFormat,
    CompletionItemTag,
    CompletionItemKind
} from "vscode-languageserver-types"
import { parseDirectiveValue } from "qingkuai/compiler"
import { isIndexesInvalid } from "../../../../../shared-util/qingkuai"
import { findTemplateAttribute, findTemplateNodeAt } from "../../util/qingkuai"

export async function getAndProcessScriptBlockCompletions(
    cr: CompileResult,
    offset: number,
    triggerCharacter: string,
    projectKind: ProjectKind,
    triggerKind: CompletionTriggerKind | undefined,
    getCompletions: GetScriptCompletionsFunc
): Promise<CompletionList | null> {
    const response = await getCompletions(
        cr.filePath,
        cr.getInterIndex(offset),
        triggerCharacter,
        triggerKind
    )
    if (!response) {
        return null
    }

    let completionItems: CompletionItem[] = []
    const unsetTriggerCharacters = new Set<string>()
    const currentNode = findTemplateNodeAt(cr.templateNodes, offset)
    const attribute = currentNode ? findTemplateAttribute(offset, currentNode) : undefined

    // 如果当前处于 #for 或 #slot 的 patterns 范围内，禁止逗号作为 commit character
    if (attribute?.name.raw === "#for" || attribute?.name.raw === "#slot") {
        try {
            const offsetInDirectiveValue = offset - attribute.value.loc.start.index
            for (const pattern of parseDirectiveValue(attribute)!.patterns) {
                if (
                    pattern?.type === "Identifier" &&
                    offsetInDirectiveValue >= pattern.start! &&
                    offsetInDirectiveValue <= pattern.end!
                ) {
                    unsetTriggerCharacters.add(",")
                }
            }
        } catch {}
    }

    let defaultEditRange: Range | undefined = undefined
    if (response.optionalReplacementSpan) {
        const { start, length } = response.optionalReplacementSpan
        defaultEditRange = cr.getVscodeRange(
            cr.getSourceIndex(start),
            cr.getSourceIndex(start + length)
        )
    }

    response.entries.forEach(entry => {
        const insertText = entry.insertText || entry.name
        const data: CompletionData = {
            projectKind,
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
            const se = cr.getSourceIndex(start + length)
            const ss = cr.getSourceIndex(start)
            if (!isIndexesInvalid(ss, se)) {
                currentItem.textEdit = {
                    newText: insertText,
                    range: cr.getVscodeRange(ss, se)
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
    // completionItems = completionItems.filter(item => {
    //     return !/['"`]/.test(trigger) || item.kind === CompletionItemKind.Constant
    // })

    return {
        itemDefaults: {
            commitCharacters: (response.defaultCommitCharacters || []).filter(char => {
                return !unsetTriggerCharacters.has(char)
            })
        },
        items: completionItems,
        isIncomplete: !!response.isIncomplete
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
