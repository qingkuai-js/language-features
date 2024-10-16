import type {
    HTMLDataDescription,
    HTMLDataTagItem,
    HTMLDataAttributeItem,
    HTMLDataValueSetValueItem,
    HTMLDataGlobalAttributeItem
} from "../types/data"
import { type TemplateNode } from "qingkuai/compiler"
import type { CompletionHandler } from "../types/handlers"

import {
    findTag,
    htmlData,
    findValueSet,
    customHTMLTags,
    findTagAttribute,
    findGlobalAttribute,
    HTMLDirectives
} from "../data/html"
import {
    Range,
    TextEdit,
    InsertTextFormat,
    CompletionItem,
    CompletionItemKind,
    CompletionTriggerKind
} from "vscode-languageserver"
import { selfClosingTags } from "../constants"
import { print } from "../../../../shared-util/sundry"
import { mdCodeBlockGen } from "../../../../shared-util/docs"
import { connection, documents, getCompileRes } from "../state"
import { getRangeByOffset, offsetPosition } from "../util/vscode"
import { doComplete as doEmmetComplete } from "@vscode/emmet-helper"
import { isEmptyString, isString, isUndefined } from "../../../../shared-util/assert"

export const completion: CompletionHandler = async ({ position, textDocument, context }) => {
    const document = documents.get(textDocument.uri)!
    const compileRes = getCompileRes(document)!
    const offset = document.offsetAt(position)
    const { source, templateNodes } = compileRes
    const node = findNodeAt(offset, templateNodes)
    // print(node, offset)

    // emmet支持，此处处理自定义标签识别
    if (isUndefined(node) || isEmptyString(node.tag)) {
        const embeddedCompletions = customHTMLTags.map(item => {
            return {
                label: item.name,
                textEdit: TextEdit.replace(
                    getRangeByOffset(document, offset - item.name.length, offset),
                    `<${item.name}>\n\t$0\n</${item.name}>`
                ),
                insertTextFormat: InsertTextFormat.Snippet,
                documentation: {
                    kind: "markdown",
                    value: getCustomTagEmmetDocumentation(item)
                }
            } satisfies CompletionItem
        })
        const emmetRes = doEmmetComplete(document, position, "html", {})
        if (!isUndefined(emmetRes)) {
            return emmetRes.items.concat(embeddedCompletions)
        }
        return embeddedCompletions
    }

    // emmet之外的补全建议只能由!、@、#、&、>、-其中一个自定义字符触发
    if (
        context?.triggerKind === CompletionTriggerKind.TriggerCharacter &&
        /[^!@#&>-]/.test(context.triggerCharacter || "")
    ) {
        return
    }

    const [nodeStartIndex, nodeEndIndex] = node.range
    const startTagEndIndex = node.startTagEndPos.index
    const endTagStartIndex = node.endTagStartPos.index
    const tagNameStartIndex = nodeStartIndex + 1
    const tagNameEndIndex = nodeStartIndex + node.tag.length + 1
    if (offset > tagNameStartIndex && offset <= tagNameEndIndex) {
        return doTagComplete(getRangeByOffset(document, tagNameStartIndex, tagNameEndIndex))
    }

    // 自动插入结束标签：上一个位置的字符是> 或者为注释开始标签<!--，插入结束标签（自闭合标签无需处理）
    if (
        (node.tag === "!" && nodeEndIndex === -1) ||
        (source[offset - 1] === ">" && endTagStartIndex === -1)
    ) {
        if (!selfClosingTags.has(node.tag)) {
            const text = node.tag === "!" ? `$0-->` : `$0</${node.tag}>`
            connection.sendNotification("html/auto-close", text)
        }
        return
    }

    // 计算并返回属性名称及属性值的补全建议（引用属性的补全建议列表单独处理，不使用htmlData中的数据）
    if (offset > tagNameEndIndex && (offset < startTagEndIndex || startTagEndIndex === -1)) {
        const attr = findAttribute(offset, node)
        const keyFirstChar = attr?.key.raw[0] || ""
        const valueEndIndex = attr?.value.loc.end.index ?? -1
        const valueStartIndex = attr?.value.loc.start.index ?? Infinity

        // 如果光标在属性值处，返回属性值的补全建议列表
        if (attr && offset >= valueStartIndex && offset <= valueEndIndex) {
            if (/[^!@#&]/.test(keyFirstChar)) {
                return doAttributeValueComplete(
                    node.tag,
                    attr.key.raw,
                    getRangeByOffset(document, valueStartIndex, valueEndIndex)
                )
            }
        } else {
            const keyEndIndex = attr?.key.loc.end.index || offset
            const keyStartIndex = attr?.key.loc.start.index || offset
            const keyRange = getRangeByOffset(document, keyStartIndex, keyEndIndex)
            if (keyFirstChar === "#") {
                return doDirectiveComplete(keyRange)
            }
            if (keyFirstChar === "&") {
                return doReferenceAttributeComplete(node, keyRange)
            }
            return doAttributeComplete(node.tag, keyFirstChar, keyRange)
        }
    }
}

// HTML标签补全建议
function doTagComplete(range: Range) {
    return htmlData.tags.map(item => {
        return {
            label: item.name,
            documentation: getDocumentation(item),
            textEdit: TextEdit.replace(range, item.name)
        } as CompletionItem
    })
}

// HTML属性补全建议
function doAttributeComplete(tag: string, startChar: string, range: Range) {
    const ret: CompletionItem[] = []
    const offsetedRange: Range = {
        start: range.start,
        end: offsetPosition(range.end, 0, 3)
    }
    const isEvent = startChar === "@"
    const isDynamic = startChar === "!"
    const isExp = startChar && (isEvent || isDynamic)

    const getExtra = (attribute: HTMLDataAttributeItem) => {
        const extraRet: Partial<CompletionItem> = {}
        if (attribute.valueSet !== "v" || isExp) {
            if (!isUndefined(attribute.valueSet) && !isExp) {
                extraRet.command = {
                    title: "suggest",
                    command: "editor.action.triggerSuggest"
                }
            }
            extraRet.textEdit = TextEdit.replace(
                offsetedRange,
                attribute.name + (isExp ? "={$0}" : '="$0"')
            )
            extraRet.insertTextFormat = InsertTextFormat.Snippet
        }
        return extraRet
    }

    findTag(tag)?.attributes.forEach(attribute => {
        if (!isEvent || attribute.name.startsWith("on")) {
            ret.push({
                ...getExtra(attribute),
                label: attribute.name,
                documentation: attribute.description
            })
        }
    })

    htmlData.globalAttributes.forEach(attribute => {
        if (!isEvent || attribute.name.startsWith("on")) {
            ret.push({
                ...getExtra(attribute),
                label: attribute.name,
                documentation: getDocumentation(attribute)
            })
        }
    })

    // 为补全建议标签添加前缀字符（!、@）
    if (isExp) {
        ret.forEach(item => {
            if (!isEvent) {
                const textEdit = item.textEdit
                item.label = startChar + item.label
                textEdit && (textEdit.newText = startChar + textEdit.newText)
            } else {
                const textEdit = item.textEdit
                item.label = startChar + item.label.slice(2)
                textEdit && (textEdit.newText = startChar + textEdit.newText.slice(2))
            }
        })
    }

    // 建议列表中的项目均为Property类型
    ret.forEach(item => {
        item.kind = CompletionItemKind.Property
    })

    return ret
}

// 获取模板指令补全建议，需要偏移插入结束位置，防止用户手动拉取补全建议时插入位置错误
function doDirectiveComplete(range: Range) {
    range.end.character += 3
    return HTMLDirectives.map(item => {
        const label = "#" + item.name
        return {
            label: label,
            filterText: label,
            insertTextFormat: InsertTextFormat.Snippet,
            textEdit: TextEdit.replace(range, `${label}={$0}`),
            documentation: {
                kind: "markdown",
                value: `${item.description}\n\n${mdCodeBlockGen("qk", item.useage)}`
            }
        } satisfies CompletionItem
    })
}

// 获取引用属性名补全建议，需要偏移插入结束位置，防止用户手动拉取补全建议时插入位置错误
// 普通标签建议列表：input -> &value, radio/checkbox -> &value/checked，select -> &value
function doReferenceAttributeComplete(node: TemplateNode, range: Range) {
    const attrs: string[] = []
    if (node.tag === "select") {
        attrs.push("value")
    } else if (node.tag === "input") {
        let type = "text"
        let cantUseRef = false
        for (const { key, value } of node.attributes) {
            if (/[!&]?type/.test(key.raw)) {
                if (key.raw !== "type") {
                    cantUseRef = true
                }
                type = value.raw
                break
            }
        }
        if (!cantUseRef) {
            if (!/radio|checkbox/.test(type)) {
                attrs.push("value")
            } else {
                attrs.push("checked", "group")
            }
        }
    }

    // 偏移插入结束位置，防止用户手动拉取补全建议时插入位置错误
    range.end.character += 3

    return attrs.map(attr => {
        return {
            label: "&" + attr,
            kind: CompletionItemKind.Property,
            insertTextFormat: InsertTextFormat.Snippet,
            textEdit: TextEdit.replace(range, `&${attr}={$0}`)
        } as CompletionItem
    })
}

// HTML属性值补全建议
function doAttributeValueComplete(tag: string, attrName: string, range: Range) {
    const getRes = (value: HTMLDataValueSetValueItem) => {
        return {
            sortText: "!",
            label: value.name,
            kind: CompletionItemKind.Value,
            documentation: getDocumentation(value),
            textEdit: TextEdit.replace(range, value.name)
        } as CompletionItem
    }

    const tagAttr = findTagAttribute(tag, attrName)
    if (tagAttr && tagAttr.valueSet && tagAttr.valueSet !== "v") {
        const values = findValueSet(tagAttr.valueSet)?.values
        if (!isUndefined(values)) {
            return values.map(getRes)
        }
    }

    const globalAttr = findGlobalAttribute(attrName)
    if (globalAttr && globalAttr.valueSet && globalAttr.valueSet !== "v") {
        return findValueSet(globalAttr.valueSet)?.values.map(getRes)
    }
}

// 找到源码中某个索引所处的AST节点
function findNodeAt(index: number, nodes: TemplateNode[]) {
    for (const node of nodes) {
        const [start, end] = node.range
        if (index > start && (end === -1 || index < end)) {
            if (node.children.length === 0) {
                return node
            }
            return findNodeAt(index, node.children)
        }
    }
}

// 找到源码中某个索引所处的attribute
function findAttribute(index: number, node: TemplateNode) {
    const attributesLen = node.attributes.length
    for (let i = 0; i < attributesLen; i++) {
        const attribute = node.attributes[i]
        const endIndex = attribute.loc.end.index
        const startIndex = attribute.loc.start.index
        if (
            index > startIndex &&
            ((endIndex === -1 && i === attributesLen - 1) || index <= endIndex)
        ) {
            return attribute
        }
    }
    for (const attribute of node.attributes) {
        const endIndex = attribute.loc.end.index
        const startIndex = attribute.loc.start.index
        if (index > startIndex && (endIndex === -1 || index <= endIndex)) {
            return attribute
        }
    }
}

// 将htmlData.tags中的description和references组合成补全建议的documentation
function getDocumentation(
    item: HTMLDataTagItem | HTMLDataGlobalAttributeItem
): HTMLDataDescription {
    if (item.references) {
        const descriptionValue = isString(item.description)
            ? item.description
            : item.description?.value || ""
        const referenceStrArr = item.references.map(reference => {
            return `[${reference.name}](${reference.url})`
        })
        const referenceStr = referenceStrArr.join(" | ")
        return {
            kind: "markdown",
            value: descriptionValue + "\n\n" + referenceStr
        }
    }
    return item.description || ""
}

// 获取自定义标签在emmet补全建议支持中的文档描述
function getCustomTagEmmetDocumentation(item: HTMLDataTagItem) {
    return (
        item.description +
        "\n\n```qk-emmet\n" +
        `<${item.name}>` +
        "\n\t|\n" +
        `</${item.name}>` +
        "\n```"
    )
}
