import type { HoverHander } from "../types/handlers"

import {
    findTagData,
    htmlDirectives,
    getDocumentation,
    findTagAttributeData,
    getDirectiveDocumentation
} from "../data/element"
import { documents } from "../state"
import { getCompileRes } from "../compile"
import { MarkupKind } from "vscode-languageserver"
import { findEventModifier } from "../util/search"
import { eventModifiers } from "../data/event-modifier"
import { htmlEntities, htmlEntitiesKeys } from "../data/entity"
import { isEmptyString, isUndefined } from "../../../../shared-util/assert"
import { findAttribute, findNodeAt, findTagRanges } from "../util/qingkuai"

export const hover: HoverHander = async ({ textDocument, position }, token) => {
    if (token.isCancellationRequested) {
        return
    }

    const cr = await getCompileRes(documents.get(textDocument.uri)!)
    const { templateNodes, getOffset, getRange, config } = cr

    const offset = getOffset(position)
    const source = cr.inputDescriptor.source
    const currentNode = findNodeAt(templateNodes, offset)
    if (!currentNode) {
        return null
    }

    // HTML标签悬停提示
    const tagRanges = findTagRanges(currentNode, offset)
    const [nodeStartIndex, nodeEndIndex] = currentNode.range
    const tagTip = config.htmlHoverTip.includes("tag")
    if (tagTip && !isUndefined(tagRanges[0])) {
        const isStart = offset <= tagRanges[0][1]
        const tagData = findTagData(currentNode.tag)
        if (isUndefined(tagData)) {
            return null
        }
        return {
            contents: getDocumentation(tagData),
            range: getRange(...tagRanges[isStart ? 0 : 1]!)
        }
    }

    // HTML属性名悬停提示
    const attribute = findAttribute(offset, currentNode)
    const attrTip = config.htmlHoverTip.includes("attribute")
    if (attrTip && attribute) {
        let attrKey = attribute.key.raw
        const keyStartIndex = attribute.key.loc.start.index
        const KeyEndIndex = attribute.key.loc.end.index
        if (offset < keyStartIndex || offset >= KeyEndIndex) {
            return null
        }

        // 指令名的提示单独处理
        if (attrKey[0] === "#") {
            attrKey = attrKey.slice(1)
            for (const item of htmlDirectives) {
                if (attrKey === item.name) {
                    return {
                        range: getRange(keyStartIndex, KeyEndIndex),
                        contents: getDirectiveDocumentation(item, false)
                    }
                }
            }
            return null
        }

        // 动态/引用属性名去掉前方的!/&从数据查找提示消息
        if (/[!&]/.test(attrKey[0])) {
            attrKey = attrKey.slice(1)
        }

        // 事件名称将@替换为on从数据中查找提示消息，注意以下两点处理细节：
        // 1. 如果当前事件名中含有事件修饰符，则将事件名的结束为止缩小到第一个修饰符之前
        // 2. 如果当前指针放置的位置处于事件修饰符范围内，此时应该返回此事件修饰符的提示信息
        if (attrKey[0] === "@") {
            const firstModifierStartIndex = attrKey.indexOf("|")
            if (
                firstModifierStartIndex === -1 ||
                offset < firstModifierStartIndex + keyStartIndex
            ) {
                if (firstModifierStartIndex === -1) {
                    attrKey = "on" + attrKey.slice(1)
                } else {
                    attrKey = "on" + attrKey.slice(1, firstModifierStartIndex)
                }
            } else {
                const modifier = findEventModifier(source, offset, [keyStartIndex, KeyEndIndex])
                if (isUndefined(modifier) || source[offset] === "|") {
                    return null
                }
                for (const item of eventModifiers) {
                    if (item.name === modifier.name) {
                        return {
                            contents: {
                                kind: "markdown",
                                value: item.description
                            },
                            range: getRange(...modifier.range)
                        }
                    }
                }
                return null
            }
        }

        const attrData = findTagAttributeData(currentNode.tag, attrKey)
        if (isUndefined(attrData)) {
            return null
        }
        return {
            contents: getDocumentation(attrData),
            range: getRange(keyStartIndex, KeyEndIndex)
        }
    }

    // HTML实体字符悬停提示
    const entityTip = config.htmlHoverTip.includes("entity")
    if (
        entityTip &&
        offset < nodeEndIndex &&
        offset >= nodeStartIndex &&
        isEmptyString(currentNode.tag)
    ) {
        let startIndex = offset
        let endIndex = offset + 1
        const validRE = /[a-zA-Z\d;]/

        // 找到当前position是否处于实体字符范围内
        while (
            endIndex < nodeEndIndex &&
            source[endIndex - 1] !== ";" &&
            validRE.test(source[endIndex])
        ) {
            endIndex++
        }
        while (startIndex > nodeStartIndex && validRE.test(source[startIndex])) {
            startIndex--
        }

        if (source[startIndex] === "&") {
            const expectKey = source.slice(startIndex + 1, endIndex)
            for (const key of htmlEntitiesKeys) {
                if (key === expectKey) {
                    const entityItem = htmlEntities[key]
                    const unicodeStr = entityItem
                        .codePointAt(0)!
                        .toString(16)
                        .toUpperCase()
                        .padStart(4, "0")
                    return {
                        range: getRange(startIndex, endIndex),
                        contents: {
                            kind: MarkupKind.Markdown,
                            value: `Character entity representing: ${entityItem}\n\nUnicode equivalent: U+${unicodeStr}`
                        }
                    }
                }
            }
        }
    }
}
