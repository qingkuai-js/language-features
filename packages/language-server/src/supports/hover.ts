import type { HoverHander } from "../types/handlers"

import {
    findTagData,
    htmlDirectives,
    getDocumentation,
    findTagAttributeData,
    getDirectiveDocumentation
} from "../data/html"
import { getCompileRes } from "../state"
import { MarkupKind } from "vscode-languageserver"
import { htmlEntities, htmlEntitiesKeys } from "../data/entity"
import { isEmptyString, isUndefined } from "../../../../shared-util/assert"
import { findAttribute, findNodeAt, findTagRanges } from "../util/qingkuai"

export const hover: HoverHander = ({ textDocument, position }) => {
    const { source, templateNodes, getOffset, getRange } = getCompileRes(textDocument)!

    const offset = getOffset(position)
    const currentNode = findNodeAt(templateNodes, offset)
    if (!currentNode) {
        return null
    }

    // HTML标签悬停提示
    const tagRanges = findTagRanges(currentNode, offset)
    const [nodeStartIndex, nodeEndIndex] = currentNode.range
    if (!isUndefined(tagRanges[0])) {
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
    if (attribute) {
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

        // 事件名称将@替换为on从数据中查找提示消息
        if (attrKey[0] === "@") {
            attrKey = "on" + attrKey.slice(1)
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

    // HTML实体字符悬停提示，这里使用双指针算法找到当前position是否处于实体字符范围内
    if (isEmptyString(currentNode.tag) && offset >= nodeStartIndex && offset < nodeEndIndex) {
        let i = offset
        let j = offset + 1
        const validRE = /[a-zA-Z\d;]/
        while (true) {
            let passed = 0
            if (i > nodeStartIndex && validRE.test(source[i])) {
                i--, passed++
            }
            if (j <= nodeEndIndex && source[j - 1] !== ";" && validRE.test(source[j])) {
                j++, passed++
            }
            if (passed === 0) {
                break
            }
        }

        if (source[i] === "&") {
            const expectKey = source.slice(i + 1, j)
            for (const key of htmlEntitiesKeys) {
                if (key === expectKey) {
                    const entityItem = htmlEntities[key]
                    const unicodeStr = entityItem
                        .codePointAt(0)!
                        .toString(16)
                        .toUpperCase()
                        .padStart(4, "0")
                    return {
                        range: getRange(i, j),
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
