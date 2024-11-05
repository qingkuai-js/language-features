import type { TemplateNode } from "qingkuai/compiler"
import type { CompletionHandler } from "../types/handlers"
import type { HTMLElementDataAttributeItem } from "../types/data"
import type { InsertSnippetParam } from "../../../../types/communication"
import type { TextDocument } from "vscode-languageserver-textdocument"
import type { Position, Range, CompletionItem } from "vscode-languageserver/node"

import {
    findTagData,
    htmlElements,
    findValueSet,
    customHTMLTags,
    htmlDirectives,
    getDocumentation,
    findTagAttributeData,
    getDirectiveDocumentation
} from "../data/element"
import { parseTemplate } from "qingkuai/compiler"
import { findEventModifier } from "../util/search"
import { connection, getCompileRes } from "../state"
import { eventModifiers } from "../data/event-modifier"
import { findAttribute, findNodeAt } from "../util/qingkuai"
import { mdCodeBlockGen } from "../../../../shared-util/docs"
import { offsetPosition, position2Range } from "../util/vscode"
import { commands, keyRelatedEventModifiers } from "../constants"
import { doComplete as _doEmmetComplete } from "@vscode/emmet-helper"
import { htmlEntities, htmlEntitiesKeys, htmlEntityRE } from "../data/entity"
import { isEmptyString, isNull, isUndefined } from "../../../../shared-util/assert"
import { TextEdit, InsertTextFormat, CompletionItemKind } from "vscode-languageserver/node"

export const complete: CompletionHandler = async ({ position, textDocument }) => {
    const rc = await getCompileRes(textDocument)
    const { source, templateNodes, document, getOffset, getRange, getPosition } = rc

    const offset = getOffset(position)
    const triggerChar = source[offset - 1] ?? ""
    const currentNode = findNodeAt(templateNodes, offset - 1)
    // print(currentNode)

    // 输入结束标签的关闭字符>时不处于任何节点，直接返回
    if (isUndefined(currentNode)) {
        return null
    }

    // 文本节点范文内启用emmet、实体字符及自定义标签补全建议支持
    if (isEmptyString(currentNode.tag)) {
        // 如果当前文本节点的父节点未闭合，且触发补全建议的位置之前是</，则自动闭合父节点
        if (
            !isNull(currentNode.parent) &&
            currentNode.parent?.range[1] === -1 &&
            source.slice(offset - 2, offset) === "</"
        ) {
            connection.sendNotification("qingkuai/insertSnippet", {
                text: `${currentNode.parent.tag}>`
            })
            return null
        }

        const completions = [
            ...doCharacterEntityComplete(
                position2Range(position),
                source,
                offset,
                currentNode.loc.start.index
            ),

            // prettier-ignore
            ...doEmbeddedLanguageTagComplete(
                position2Range(position),
                source,
                offset,
                currentNode
            )
        ]

        // 如果是由<触发的补全建议获取，则列举所有标签名建议
        if (source[offset - 1] === "<") {
            completions.push(...doTagComplete(position2Range(position)))
        }

        return completions.concat(doEmmetComplete(document, position)?.items ?? [])
    }

    // 下面的补全建议只能由这些自定义字符触发：!、@、#、&、>、=、|、-
    if (/[^[a-zA-Z]!@#&>=\|\-\/]/.test(triggerChar)) {
        return null
    }

    const [nodeStartIndex, nodeEndIndex] = currentNode.range
    const startTagEndIndex = currentNode.startTagEndPos.index
    const tagNameEndIndex = nodeStartIndex + currentNode.tag.length + 1
    if (offset > nodeStartIndex + 1 && offset <= tagNameEndIndex) {
        return doTagComplete(getRange(nodeStartIndex + 1, tagNameEndIndex))
    }

    // 开始标签输入结束时自动插入结束标签
    if (
        nodeEndIndex === -1 &&
        currentNode.tag !== "!" &&
        source[offset - 1] === ">" &&
        offset === startTagEndIndex
    ) {
        connection.sendNotification("qingkuai/insertSnippet", {
            text: `$0</${currentNode.tag}>`
        })
        return null
    }

    // 自动插入注释节点的闭合文本
    if (currentNode.tag === "!") {
        if (source.slice(offset - 4) === "<!--") {
            connection.sendNotification("qingkuai/insertSnippet", {
                text: `$0-->`
            })
        }
        return null
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

        let hasValue = valueStartIndex !== Infinity && valueStartIndex !== -1

        // 如果上前一个字符为等号且不存在引号或大括号，则自动添加引号对或大括号对
        // 如果属性为非动态/引用/指令/事件且htmlData中该属性valueSet不为v则在此请求补全建议
        if (attr && valueStartIndex === attr.loc.end.index && source[offset - 1] === "=") {
            const snippetItem: InsertSnippetParam = {
                text: isInterpolation ? "{$0}" : '"$0"'
            }
            if (!isInterpolation) {
                const atttData = findTagAttributeData(currentNode.tag, attrKey)
                if (atttData?.valueSet && atttData.valueSet !== "v") {
                    snippetItem.command = commands.TriggerCommand
                }
            }
            connection.sendNotification("qingkuai/insertSnippet", snippetItem)
            return null
        }

        // 如果光标在属性值处，返回属性值的补全建议列表
        // 如果当前不处于任何属性范围内或者处于属性名范围内，则返回属性名补全建议列表
        if (attr && offset >= valueStartIndex && offset <= valueEndIndex) {
            if (!isInterpolation) {
                // 如果是在HTML属性内输入实体字符，则返回实体字符建议
                const characterEntityCompletions = doCharacterEntityComplete(
                    position2Range(position),
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
                    getRange(valueStartIndex, valueEndIndex)
                )
            }
        } else if (isUndefined(attr) || offset <= keyEndIndex) {
            const keyRange = getRange(keyStartIndex, keyEndIndex)

            // 返回引用属性补全建议
            if (keyFirstChar === "&") {
                return doReferenceAttributeComplete(
                    currentNode,
                    hasValue,
                    getRange(keyStartIndex, keyEndIndex)
                )
            }

            // 如果处于事件修饰符范围内，则提返回事件修饰符补全建议
            if (keyFirstChar === "@") {
                const firstModifierStartIndex = attrKey.indexOf("|")
                const modifier = findEventModifier(source, offset, [keyStartIndex, keyEndIndex])

                // 已经存在的修饰符不再提示（注意：如果光标在这个存在的修饰符范围内，需要重新提醒，这种情况多发生在
                // 用户主动调用客户端命令来获取补全建议时（vscode对应的命令：editor.action.triggerSuggest）
                if (!isUndefined(modifier)) {
                    const existingItems = new Set<string>()
                    const items = attrKey.slice(firstModifierStartIndex).split("|")
                    for (
                        let i = 0, j = keyStartIndex + firstModifierStartIndex;
                        i < items.length;
                        i++
                    ) {
                        if (offset < j || offset >= (j += items[i].length + 1)) {
                            existingItems.add(items[i])
                        }
                    }
                    return doEventModifierComplete(
                        existingItems,
                        getRange(...modifier.range),
                        attrKey.slice(1, firstModifierStartIndex)
                    )
                }

                // 如果属性名之后存在修饰符，就不会自动插入等号和大括号
                if (firstModifierStartIndex !== -1) {
                    hasValue = true
                    keyRange.end = getPosition(keyStartIndex + firstModifierStartIndex)
                }
            }

            return doAttributeNameComplete(currentNode.tag, keyRange, hasValue, keyFirstChar)
        }
    }
}

// HTML标签补全建议
function doTagComplete(range: Range) {
    return htmlElements.tags.map(item => {
        return {
            label: item.name,
            documentation: getDocumentation(item),
            textEdit: TextEdit.replace(range, item.name)
        } as CompletionItem
    })
}

// 自定义HTML标签补全建议（模拟emmet行为）
function doEmbeddedLanguageTagComplete(
    range: Range,
    source: string,
    offset: number,
    node: TemplateNode
): CompletionItem[] {
    let shouldSuggest = false

    for (let i = offset - 1; i >= node.loc.start.index; i--) {
        if (/[a-z\-]/.test(source[i] || "")) {
            range.start.character--
            shouldSuggest = true
        } else break
    }

    if (shouldSuggest && isNull(node.parent)) {
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

// emmet支持，此方法会将特殊属性值（动态/引用属性、指令、事件名）转换为花括号包裹
// 注意：在emmet语法中，以感叹号开头的属性名是要被忽略的属性，qingkuai修改了这一语法（短横线-开头）
// 由于修改了默认语法，所以此修改并未提交给emmet，而是通过pnpm patch完成的，若之后版本升级需要重新打补丁
function doEmmetComplete(document: TextDocument, position: Position) {
    const ret = _doEmmetComplete(document, position, "html", {})
    ret?.items.forEach(item => {
        const setNT = (text: string) => (item.textEdit!.newText = text)
        parseTemplate(item.textEdit?.newText || "", false).forEach(node => {
            node.attributes.forEach(attr => {
                const v = attr.value.raw
                const vsi = attr.value.loc.start.index - 1
                const newText = item.textEdit?.newText || ""
                const restStr = newText.slice(attr.loc.end.index)
                if (/^[!@#&]/.test(attr.key.raw)) {
                    setNT(`${newText.slice(0, vsi)}{${v}}${restStr}`)
                }
            })
        })
        item.documentation = item.textEdit?.newText.replace(/\$\{\d+\}/g, "|")
    })
    return ret
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
function doAttributeNameComplete(tag: string, range: Range, hasValue: boolean, startChar: string) {
    const ret: CompletionItem[] = []
    const isEvent = startChar === "@"
    const isDynamic = startChar === "!"
    const isDynamicOrEvent = startChar && (isEvent || isDynamic)

    // 获取属性名补全建议的附加属性（标签属性名和全局属性名通用方法），此方法会根据条件添加
    // 插入范围属性，选中该建议后是否再次触发补全建议的command属性以及插入格式属性（Snippet）
    const getExtra = (attribute: HTMLElementDataAttributeItem) => {
        let assignText = ""
        const valueSet = attribute.valueSet || "v"
        const extraRet: Partial<CompletionItem> = {}
        if (!hasValue) {
            assignText = isDynamicOrEvent ? "={$0}" : '="$0"'
            extraRet.insertTextFormat = InsertTextFormat.Snippet
        }
        if (valueSet !== "v" && !isDynamicOrEvent && !hasValue) {
            extraRet.command = {
                title: "suggest",
                command: commands.TriggerCommand
            }
        }
        return {
            ...extraRet,
            kind: CompletionItemKind.Property,
            textEdit: TextEdit.replace(range, attribute.name + assignText)
        }
    }

    if (startChar !== "#") {
        // 查找指定标签的所有属性名作为补全建议
        findTagData(tag)?.attributes.forEach(attribute => {
            if (!isEvent || attribute.name.startsWith("on")) {
                ret.push({
                    ...getExtra(attribute),
                    label: attribute.name,
                    documentation: attribute.description
                })
            }
        })

        // 全局属性的所有项都会被作为属性名补全建议
        htmlElements.globalAttributes.forEach(attribute => {
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
                item.kind = CompletionItemKind.Event
                item.label = startChar + item.label.slice(2)
                textEdit && (textEdit.newText = startChar + textEdit.newText.slice(2))
            }
        })
    } else {
        // 如果属性名非动态非事件，则将所有指令添加到补全建议列表中
        // 指令名补全建议会有两种filterText，一种有#前缀，一种没有，这样做的好处就是无论
        // 用户有没有输入#前缀都会返回指令名补全建议，例如：#f和f都可以得到for指令的补全建议
        const directiveCompletions = htmlDirectives.map(item => {
            const label = "#" + item.name
            const newText = label + (hasValue ? "" : "={$0}")
            const completion: CompletionItem = {
                label: label,
                filterText: label,
                kind: CompletionItemKind.Keyword,
                textEdit: TextEdit.replace(range, newText),
                insertTextFormat: InsertTextFormat.Snippet,
                documentation: getDirectiveDocumentation(item, true)
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

function doEventModifierComplete(existingItems: Set<string>, range: Range, key: string) {
    const ret: CompletionItem[] = []
    const keyRelatedEvents = new Set(["keyup", "keydown", "keypress"])
    const hasKeyRelatedModifier = Array.from(existingItems).some(modifier => {
        return keyRelatedEventModifiers.has(modifier)
    })

    eventModifiers.forEach(item => {
        if (existingItems.has(item.name)) {
            return
        }
        if (key !== "input" && item.name === "compose") {
            return
        }
        if (keyRelatedEventModifiers.has(item.name)) {
            if (hasKeyRelatedModifier || !keyRelatedEvents.has(key)) {
                return
            }
        }
        ret.push({
            label: item.name,
            documentation: {
                kind: "markdown",
                value: item.description
            },
            kind: CompletionItemKind.Constant,
            textEdit: TextEdit.replace(range, item.name)
        })
    })

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
    const attrData = findTagAttributeData(tag, attrName)
    if (!isUndefined(attrData)) {
        return findValueSet(attrData.valueSet || "")?.values.map(value => {
            return {
                sortText: "!",
                label: value.name,
                kind: CompletionItemKind.Value,
                documentation: getDocumentation(value),
                textEdit: TextEdit.replace(range, value.name)
            } as CompletionItem
        })
    }
}
