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
    HTMLDirectives,
    findTagAttribute,
    findGlobalAttribute
} from "../data/html"
import {
    Range,
    TextEdit,
    InsertTextFormat,
    CompletionItem,
    CompletionItemKind
} from "vscode-languageserver"
import { print } from "../../../../shared-util/sundry"
import { commands, selfClosingTags } from "../constants"
import { mdCodeBlockGen } from "../../../../shared-util/docs"
import { connection, documents, getCompileRes } from "../state"
import { getRangeByOffset, offsetPosition } from "../util/vscode"
import { doComplete as doEmmetComplete } from "@vscode/emmet-helper"
import { htmlEntities, htmlEntitiesKeys, htmlEntityRE } from "../data/entity"
import { isEmptyString, isNull, isString, isUndefined } from "../../../../shared-util/assert"

export const completion: CompletionHandler = async ({ position, textDocument, context }) => {
    const document = documents.get(textDocument.uri)!
    const compileRes = getCompileRes(textDocument)!
    const offset = document.offsetAt(position)
    const { source, templateNodes } = compileRes
    const currentNode = findNodeAt(offset, templateNodes)
    const triggerChar = context?.triggerCharacter ?? ""
    // print(currentNode)

    // 输入结束标签的关闭字符>时不处于任何节点，直接返回
    if (isUndefined(currentNode)) return

    // emmet支持，此处处理实体字符和自定义标签的补全建议
    if (isEmptyString(currentNode.tag)) {
        const range = getRangeByOffset(document, offset)

        const characterEntityCompletions = doCharacterEntityComplete(
            range,
            source,
            offset,
            currentNode.loc.start.index
        )
        if (characterEntityCompletions.length > 0) {
            return characterEntityCompletions
        }

        // 如果是由<触发的补全建议获取，则列举所有标签名建议
        if (source[offset - 1] === "<") {
            return doTagComplete(getRangeByOffset(document, offset))
        }

        const customTagCompletions = doCustomTagComplete(range, source, offset, currentNode)
        const emmetRes = doEmmetComplete(document, position, "html", {})
        if (!isUndefined(emmetRes)) {
            return emmetRes.items.push(...customTagCompletions), emmetRes
        }
        return customTagCompletions
    }

    // 下面的补全建议只能由这些自定义字符触发：!、@、#、&、>、-、=
    if (/[^!@#&>\-=]/.test(triggerChar)) {
        return
    }

    const [nodeStartIndex, nodeEndIndex] = currentNode.range
    const startTagEndIndex = currentNode.startTagEndPos.index
    const tagNameEndIndex = nodeStartIndex + currentNode.tag.length + 1
    if (offset > nodeStartIndex + 1 && offset <= tagNameEndIndex) {
        return doTagComplete(getRangeByOffset(document, nodeStartIndex + 1, tagNameEndIndex))
    }

    // 自动插入结束标签：上一个位置的字符是> 或者为注释开始标签<!--，插入结束标签（自闭合标签无需处理）
    if (
        (currentNode.tag === "!" && nodeEndIndex === -1) ||
        (source[offset - 1] === ">" && startTagEndIndex === offset)
    ) {
        if (!selfClosingTags.has(currentNode.tag)) {
            connection.sendNotification("qingkuai/insertSnippet", {
                text: currentNode.tag === "!" ? `$0-->` : `$0</${currentNode.tag}>`
            })
        }
        return
    }

    // 计算并返回属性名称及属性值的补全建议（引用属性的补全建议列表单独处理，不使用htmlData中的数据）
    if (offset > tagNameEndIndex && (offset < startTagEndIndex || startTagEndIndex === -1)) {
        const attr = findAttribute(offset, currentNode)
        const attrKey = attr?.key.raw || ""
        const keyFirstChar = attrKey[0] || ""
        const isInterpolation = /[!@#&]/.test(keyFirstChar)
        const keyEndIndex = attr?.key.loc.end.index || offset
        const valueEndIndex = attr?.value.loc.end.index ?? -1
        const keyStartIndex = attr?.key.loc.start.index || offset
        const valueStartIndex = attr?.value.loc.start.index ?? Infinity
        const keyRange = getRangeByOffset(document, keyStartIndex, keyEndIndex)
        const hasValue = valueStartIndex !== Infinity && valueStartIndex !== -1

        // 判断当前属性是否有推荐的属性值：非动态/引用/指令/事件且htmlData中该属性valueSet不为v
        const hasRecommendedValue = () => {
            if (/^(?:[!@#&]|$)/.test(attrKey)) {
                return false
            }
            const valueSet = (
                findTagAttribute(currentNode.tag, attrKey) || findGlobalAttribute(attrKey)
            )?.valueSet
            return valueSet && valueSet !== "v"
        }

        // 如果光标在属性值处，返回属性值的补全建议列表
        // 如果上前一个字符为等号且不存在引号或大括号，则自动添加引号对或大括号对
        // 如果当前不处于任何属性范围内或者处于属性名范围内，则返回属性名补全建议列表
        if (attr && offset >= valueStartIndex && offset <= valueEndIndex) {
            if (source[offset - 1] === "=") {
                const snippetItem: InsertSnippetParam = {
                    text: isInterpolation ? "{$0}" : '"$0"'
                }
                if (hasRecommendedValue()) {
                    snippetItem.command = commands.TriggerCommand
                }
                connection.sendNotification("qingkuai/insertSnippet", snippetItem)
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
                    currentNode.tag,
                    attr.key.raw,
                    getRangeByOffset(document, valueStartIndex, valueEndIndex)
                )
            }
        } else if (isUndefined(attr) || offset <= keyEndIndex) {
            if (keyFirstChar === "&") {
                return doReferenceAttributeComplete(currentNode, hasValue, keyRange)
            }
            return doAttributeNameComplete(currentNode.tag, hasValue, keyFirstChar, keyRange)
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
    const existingEntity = htmlEntityRE.exec(source.slice(offset))

    // 如果替换开始位置处存在实体字符则将替换范围修改为此实体字符的位置范围
    if (!isNull(existingEntity)) {
        range.end = offsetPosition(range.start, 0, existingEntity[0].length)
    }

    if (source[offset] === "&") {
        htmlEntitiesKeys.forEach(key => {
            const label = `&${key}`
            if (key.endsWith(";")) {
                ret.push({
                    label: label,
                    textEdit: TextEdit.replace(
                        {
                            start: range.start,
                            end: isNull(existingEntity)
                                ? range.end
                                : offsetPosition(range.start, 0, existingEntity[0].length)
                        },
                        label
                    ),
                    kind: CompletionItemKind.Keyword,
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
    const isDynamicOrEvent = startChar && (isEvent || isDynamic)

    // 获取属性名补全建议的附加属性（标签属性名和全局属性名通用方法），此方法会根据条件添加
    // 插入范围属性，选中该建议后是否再次触发补全建议的command属性以及插入格式属性（Snippet）
    const getExtra = (attribute: HTMLDataAttributeItem) => {
        let assignText = ""
        const extraRet: Partial<CompletionItem> = {}
        if (!hasValue) {
            assignText = isDynamicOrEvent ? "={$0}" : '="$0"'
        }
        if (attribute.valueSet !== "v" || isDynamicOrEvent) {
            if (!isUndefined(attribute.valueSet) && !isDynamicOrEvent && !hasValue) {
                extraRet.command = {
                    title: "suggest",
                    command: commands.TriggerCommand
                }
            }
            extraRet.insertTextFormat = InsertTextFormat.Snippet
        }
        return {
            ...extraRet,
            kind: CompletionItemKind.Property,
            textEdit: TextEdit.replace(range, attribute.name + assignText)
        }
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
    if (isDynamicOrEvent) {
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
    } else {
        // 如果属性名非动态非事件，则将所有指令添加到补全建议列表中
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
        ret.push(...directiveCompletions.flat())
    }

    return ret
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

// 找到源码中某个索引所处的AST节点
function findNodeAt(index: number, nodes: TemplateNode[]): TemplateNode | undefined {
    for (const currentNode of nodes) {
        const [start, end] = currentNode.range
        const isTextContent = isEmptyString(currentNode.tag)
        if (index > start && (end === -1 || index < end + +isTextContent)) {
            if (currentNode.children.length === 0) {
                return currentNode
            }
            return findNodeAt(index, currentNode.children) || currentNode
        }
    }
}
