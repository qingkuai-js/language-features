import type {
    GetCompletionResult,
    TPICCommonRequestParams
} from "../../../../../types/communication"
import type { CompletionItem, Range } from "vscode-languageserver/node"
import type { CachedCompileResultItem, CompletionData } from "../../types/service"

import {
    TextEdit,
    CompletionItemTag,
    InsertTextFormat,
    CompletionItemKind
} from "vscode-languageserver/node"
import { isNull } from "../../../../../shared-util/assert"
import { limitedScriptLanguageFeatures, tpic } from "../../state"
import { isIndexesInvalid } from "../../../../../shared-util/qingkuai"
import { INTER_NAMESPACE, TPICHandler } from "../../../../../shared-util/constant"
import { INVALID_COMPLETION_TEXT_LABELS, MAYBE_INVALID_COMPLETION_LABELS } from "../../constants"

const optionalSameKeys = [
    "preselect",
    "filterText",
    "insertText",
    "labelDetails",
    "commitCharacters"
] as const

export async function doScriptBlockComplete(
    cr: CachedCompileResultItem,
    offset: number,
    triggerChar: string
) {
    if (limitedScriptLanguageFeatures) {
        return null
    }

    const { getRange, getSourceIndex } = cr
    const unsetTriggerCharacters = new Set<string>()
    const positionOfInterCode = cr.getInterIndex(offset)
    const tsCompletionRes: GetCompletionResult = await tpic.sendRequest<TPICCommonRequestParams>(
        TPICHandler.GetCompletion,
        {
            fileName: cr.filePath,
            pos: positionOfInterCode
        }
    )

    if (isNull(tsCompletionRes)) {
        return null
    }

    let completionItems: CompletionItem[] = tsCompletionRes.entries.map(item => {
        const data: CompletionData = {
            kind: "script",
            original: item.data,
            source: item.source,
            entryName: item.name,
            fileName: cr.filePath,
            pos: positionOfInterCode
        }
        const ret: CompletionItem = {
            data,
            label: item.label,
            sortText: item.sortText,
            kind: convertTsCompletionKind(item.kind)
        }
        optionalSameKeys.forEach(key => {
            // @ts-expect-error
            item[key] && (ret[key] = item[key])
        })

        if (item.source) {
            ret.labelDetails = {
                description: item.source
            }
        }
        if (item.isColor) {
            ret.kind = CompletionItemKind.Color
        }
        if (item.deprecated) {
            ret.tags = [CompletionItemTag.Deprecated]
        }
        if (item.isSnippet) {
            ret.insertTextFormat = InsertTextFormat.Snippet
        }
        if (item.replacementSpan) {
            const { start, length } = item.replacementSpan
            const se = getSourceIndex(start + length, true)
            const ss = getSourceIndex(start)
            if (!isIndexesInvalid(ss, se)) {
                ret.textEdit = TextEdit.replace(getRange(ss, se), item.name)
            }
        } else {
            ret.textEdit = TextEdit.insert(cr.getPosition(offset), item.name)
        }
        if (ret.kind === CompletionItemKind.Text || ret.kind === CompletionItemKind.Constant) {
            ret.commitCharacters = undefined
        }

        return ret
    })

    // 过滤无效的补全建议
    completionItems = completionItems.filter(item => {
        if (!item.textEdit) {
            return false
        }
        if (item.label === INTER_NAMESPACE) {
            return false
        }
        if (/['"`]/.test(triggerChar)) {
            return item.kind === CompletionItemKind.Constant
        }
        if (
            item.kind === CompletionItemKind.Text &&
            INVALID_COMPLETION_TEXT_LABELS.has(item.label)
        ) {
            return false
        }
        if (!MAYBE_INVALID_COMPLETION_LABELS.has(item.label)) {
            return true
        }

        const preContent = cr.code.slice(0, cr.getInterIndex(offset))
        return !new RegExp(`${INTER_NAMESPACE}\\.\\s*`).test(preContent)
    })

    let defaultEditRange: Range | undefined = undefined
    if (tsCompletionRes.defaultRepalcementSpan) {
        const { start, length } = tsCompletionRes.defaultRepalcementSpan
        defaultEditRange = getRange(getSourceIndex(start), getSourceIndex(start + length, true))
    }

    return {
        items: completionItems,
        isIncomplete: tsCompletionRes.isIncomplete,
        itemDefaults: {
            editRange: defaultEditRange,
            commitCharacters: tsCompletionRes.defaultCommitCharacters.filter(char => {
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
