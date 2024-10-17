import type {
    HTMLDataDescription,
    HTMLDataTagItem,
    HTMLDataAttributeItem,
    HTMLDataValueSetValueItem,
    HTMLDataGlobalAttributeItem
} from "../types/data"
import type { TemplateNode } from "qingkuai/compiler"
import type { CompletionHandler } from "../types/handlers"
import type { InsertSnippetParam } from "../../../../types/server"

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
    CompletionItemKind
} from "vscode-languageserver"
import { getRangeByOffset } from "../util/vscode"
import { print } from "../../../../shared-util/sundry"
import { commands, selfClosingTags } from "../constants"
import { mdCodeBlockGen } from "../../../../shared-util/docs"
import { connection, documents, getCompileRes } from "../state"
import { doComplete as doEmmetComplete } from "@vscode/emmet-helper"
import { isEmptyString, isNull, isString, isUndefined } from "../../../../shared-util/assert"
import { htmlEntities, htmlEntitiesKeys } from "../data/entity"

export const completion: CompletionHandler = async ({ position, textDocument, context }) => {
    const document = documents.get(textDocument.uri)!
    const compileRes = getCompileRes(document)!
    const offset = document.offsetAt(position)
    const { source, templateNodes } = compileRes
    const node = findNodeAt(offset, templateNodes)
    const triggerChar = context?.triggerCharacter ?? ""
    // print(node)

    // 输入结束标签的关闭字符>时不处于任何节点，直接返回
    if (isUndefined(node)) return

    // emmet支持，此处处理实体字符和自定义标签的补全建议
    if (isEmptyString(node.tag)) {
        const range = getRangeByOffset(document, offset)

        const characterEntityCompletions = doCharacterEntityComplete(
            range,
            source,
            offset,
            node.loc.start.index
        )
        if (characterEntityCompletions.length > 0) {
            return characterEntityCompletions
        }

        // 如果是由<触发的补全建议获取，则列举所有标签名建议
        if (source[offset - 1] === "<") {
            return doTagComplete(getRangeByOffset(document, offset))
        }

        const customTagCompletions = doCustomTagComplete(range, source, offset, node)
        const emmetRes = doEmmetComplete(document, position, "html", {})
        if (!isUndefined(emmetRes)) {
            return emmetRes.items.concat(customTagCompletions)
        }
        return customTagCompletions
    }

    // 下面的补全建议只能由这些自定义字符触发：!、@、#、&、>、-、=
    if (/[^!@#&>\-=]/.test(triggerChar)) {
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
            connection.sendNotification("insertSnippet", {
                text: node.tag === "!" ? `$0-->` : `$0</${node.tag}>`
            })
        }
        return
    }

    // 计算并返回属性名称及属性值的补全建议（引用属性的补全建议列表单独处理，不使用htmlData中的数据）
    if (offset > tagNameEndIndex && (offset < startTagEndIndex || startTagEndIndex === -1)) {
        const attr = findAttribute(offset, node)
        const keyFirstChar = attr?.key.raw[0] || ""
        const isInterpolation = /[!@#&]/.test(keyFirstChar)
        const keyEndIndex = attr?.key.loc.end.index || offset
        const valueEndIndex = attr?.value.loc.end.index ?? -1
        const keyStartIndex = attr?.key.loc.start.index || offset
        const valueStartIndex = attr?.value.loc.start.index ?? Infinity
        const keyRange = getRangeByOffset(document, keyStartIndex, keyEndIndex)
        const hasValue = valueStartIndex !== Infinity && valueStartIndex !== -1

        // 如果光标在属性值处，返回属性值的补全建议列表
        if (attr && offset >= valueStartIndex && offset <= valueEndIndex) {
            if (source[offset - 1] === "=") {
                connection.sendNotification("insertSnippet", {
                    command: commands.TriggerCommand,
                    text: isInterpolation ? "{$0}" : '"$0"'
                } satisfies InsertSnippetParam)
            } else if (!isInterpolation) {
                // 如果是在HTML属性内输入实体字符，则返回实体字符建议
                const characterEntityCompletions = doCharacterEntityComplete(
                    getRangeByOffset(document, offset),
                    source,
                    offset,
                    valueStartIndex
                )
                if (characterEntityCompletions.length > 0) {
                    return characterEntityCompletions
                }

                // 返回属性值建议
                return doAttributeValueComplete(
                    node.tag,
                    hasValue,
                    attr.key.raw,
                    getRangeByOffset(document, valueStartIndex, valueEndIndex)
                )
            }
        } else {
            // 如果上前一个字符为等号且不存在引号或大括号，则自动添加引号对或大括号对
            if (source[offset - 1] === "=" && valueEndIndex === attr?.loc.end.index) {
                connection.sendNotification("insertSnippet", {
                    command: commands.TriggerCommand,
                    text: isInterpolation ? "{$0}" : '"$0"'
                } satisfies InsertSnippetParam)
            } else if (isUndefined(attr) || offset <= keyEndIndex) {
                if (keyFirstChar === "&") {
                    return doReferenceAttributeComplete(node, hasValue, keyRange)
                }
                return doAttributeNameComplete(node.tag, hasValue, keyFirstChar, keyRange)
            }
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

// 自定义HTML标签补全建议（模拟emmet行为）
function doCustomTagComplete(
    range: Range,
    source: string,
    offset: number,
    node: TemplateNode
): CompletionItem[] {
    // 找到自定义标签建议替换范围的开始位置：首个非空字符的位置
    for (let i = offset - 1; i >= node.loc.start.index; i--) {
        if (!/\s/.test(source[i] || "")) {
            range.start.character--
        } else break
    }
    range.start.character = Math.max(range.start.character, 0)

    if (isNull(node.parent)) {
        return customHTMLTags.map(({ name, description }) => {
            return {
                label: name,
                insertTextFormat: InsertTextFormat.Snippet,
                documentation: {
                    kind: "markdown",
                    value:
                        `${description}\n\n` +
                        mdCodeBlockGen("qk-emmet", `<${name}>\n\t|\n</${name}>`)
                },
                textEdit: TextEdit.replace(range, `<${name}>\n\t$0\n</${name}>`)
            } satisfies CompletionItem
        })
    }
    return []
}

// HTML实体字符补全建议
function doCharacterEntityComplete(range: Range, source: string, offset: number, endIndex: number) {
    // 找到实体字符标建议替换范围的开始位置：&的前一个字符或非字母且非数字的字符的位置
    for (let i = offset - 1; i >= endIndex; i--) {
        if (/[&a-zA-Z\d]/.test(source[i] || "")) {
            offset--
            range.start.character--
            if (source[i] === "&") {
                break
            }
        } else break
    }

    const ret: CompletionItem[] = []
    if (source[offset] === "&") {
        htmlEntitiesKeys.forEach(key => {
            const label = `&${key}`
            if (key.endsWith(";")) {
                ret.push({
                    label: label,
                    textEdit: TextEdit.replace(range, label),
                    documentation: `Character entity representing ${htmlEntities[key]}`
                })
            }
        })
    }
    return ret
}

// HTML属性名补全建议
function doAttributeNameComplete(tag: string, hasValue: boolean, startChar: string, range: Range) {
    const ret: CompletionItem[] = []
    const isEvent = startChar === "@"
    const isDynamic = startChar === "!"
    const isSpecial = startChar && (isEvent || isDynamic)

    // 获取属性名补全建议的附加属性（标签属性名和全局属性名通用方法），此方法会根据条件添加
    // 插入范围属性，选中该建议后是否再次触发补全建议的command属性以及插入格式属性（Snippet）
    const getExtra = (attribute: HTMLDataAttributeItem) => {
        let assignText = ""
        const extraRet: Partial<CompletionItem> = {}
        if (!hasValue) {
            assignText = isSpecial ? "={$0}" : '="$0"'
        }
        if (attribute.valueSet !== "v" || isSpecial) {
            if (!isUndefined(attribute.valueSet) && !isSpecial && !hasValue) {
                extraRet.command = {
                    title: "suggest",
                    command: commands.TriggerCommand
                }
            }
            extraRet.insertTextFormat = InsertTextFormat.Snippet
            extraRet.textEdit = TextEdit.replace(range, attribute.name + assignText)
        }
        return { kind: CompletionItemKind.Property, ...extraRet }
    }

    if (startChar !== "#") {
        // 查找指定标签的所有属性名作为补全建议
        findTag(tag)?.attributes.forEach(attribute => {
            if (!isEvent || attribute.name.startsWith("on")) {
                ret.push({
                    ...getExtra(attribute),
                    label: attribute.name,
                    documentation: attribute.description
                })
            }
        })

        // 全局属性的所有项都会被作为属性名补全建议
        htmlData.globalAttributes.forEach(attribute => {
            if (!isEvent || attribute.name.startsWith("on")) {
                ret.push({
                    ...getExtra(attribute),
                    label: attribute.name,
                    documentation: getDocumentation(attribute)
                })
            }
        })
    }

    // 为补全建议标签添加前缀字符（!、@）
    if (isSpecial) {
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

    // 指令名补全建议会有两种filterText，一种有#前缀，一种没有，这样做的好处就是无论
    // 用户有没有输入#前缀都会返回指令名补全建议，例如：#f和f都可以得到for指令的补全建议
    const directiveCompletions = HTMLDirectives.map(item => {
        const label = "#" + item.name
        const newText = label + (hasValue ? "" : "={$0}")
        const completion: CompletionItem = {
            label: label,
            filterText: label,
            kind: CompletionItemKind.Keyword,
            textEdit: TextEdit.replace(range, newText),
            insertTextFormat: InsertTextFormat.Snippet,
            documentation: {
                kind: "markdown",
                value: `${item.description}\n\n${mdCodeBlockGen("qk", item.useage)}`
            }
        }
        return [
            completion,
            {
                ...completion,
                filterText: item.name
            }
        ]
    })

    return ret.concat(...directiveCompletions)
}

// 获取引用属性名补全建议，普通标的引用属性签建议列表如下：
// input -> &value, radio/checkbox -> &value/checked，select -> &value
function doReferenceAttributeComplete(node: TemplateNode, hasValue: boolean, range: Range) {
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

    return attrs.map(attr => {
        return {
            label: "&" + attr,
            kind: CompletionItemKind.Property,
            insertTextFormat: InsertTextFormat.Snippet,
            textEdit: TextEdit.replace(range, `&${attr}${hasValue ? "" : "={$0}"}`)
        } as CompletionItem
    })
}

// HTML属性值补全建议
function doAttributeValueComplete(tag: string, hasValue: boolean, attrName: string, range: Range) {
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
        const isTextContent = isEmptyString(node.tag)
        if (index > start && (end === -1 || index < end + +isTextContent)) {
            if (node.children.length === 0) {
                return node
            }
            return findNodeAt(index, node.children)
        }
    }
}

// 找到源码中某个索引所处的attribute
function findAttribute(index: number, node: TemplateNode) {
    for (let i = 0; i < node.attributes.length; i++) {
        const attribute = node.attributes[i]
        const endIndex = attribute.loc.end.index

        // 1. 不存在等号（属性名范围内，attribute.value.loc.start.index为-1）
        // 2. 存在等号但不存在引号或大括号（endIndex与attribute.value.loc.end.index相等）
        // 上面两种情况其中一个成立时，记录范围增量为1（光标在attribute.loc.end.index处也视为在当前属性范围内）
        // 这样处理是因为情况1要在输入等号时自动插入引号或大括号包裹，情况2要明确当前正在输入属性名并给出属性名补全建议
        const delta = Number(
            attribute.value.loc.start.index === -1 || endIndex === attribute.value.loc.end.index
        )

        if (index > attribute.loc.start.index && (endIndex === -1 || index < endIndex + delta)) {
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
