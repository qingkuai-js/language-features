import type { HoverHander } from "../types/handlers"

import {
    findTagData,
    htmlDirectives,
    getDocumentation,
    findTagAttributeData,
    getDirectiveDocumentation
} from "../data/html"
import { getCompileRes } from "../state"
import { isEmptyString, isUndefined } from "../../../../shared-util/assert"
import { findAttribute, findNodeAt } from "../util/qingkuai"
import { htmlEntities, htmlEntitiesKeys } from "../data/entity"
import { MarkupKind } from "vscode-languageserver"

export const hover: HoverHander = ({ textDocument, position }) => {
    const { source, templateNodes, getOffset, getRange } = getCompileRes(textDocument, position)!

    const offset = getOffset(position)
    const currentNode = findNodeAt(templateNodes, offset)
    if (!currentNode) {
        return null
    }

    let tagStartIndex = -1
    const tagLen = currentNode.tag.length
    const nodeEndIndex = currentNode.loc.end.index
    const nodeStartIndex = currentNode.loc.start.index

    const startTagStartIndex = nodeStartIndex + 1
    const endTagStartIndex = currentNode.endTagStartPos.index + 2
    if (offset >= startTagStartIndex && offset < startTagStartIndex + tagLen) {
        tagStartIndex = startTagStartIndex
    } else if (offset >= endTagStartIndex && offset < endTagStartIndex + tagLen) {
        tagStartIndex = endTagStartIndex
    }

    // 获取HTML标签悬停提示
    if (tagStartIndex !== -1) {
        const tagData = findTagData(currentNode.tag)
        if (isUndefined(tagData)) {
            return null
        }
        return {
            contents: getDocumentation(tagData),
            range: getRange(tagStartIndex, tagStartIndex + tagLen)
        }
    }

    const attribute = findAttribute(offset, currentNode)
    if (attribute) {
        let attrKey = attribute.key.raw
        const keyStartIndex = attribute.key.loc.start.index
        const KeyEndIndex = attribute.key.loc.end.index
        if (offset >= keyStartIndex && offset <= KeyEndIndex) {
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
            if (/[!&]/.test(attrKey[0])) {
                attrKey = attrKey.slice(1)
            }
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
    }

    // HTML实体字符悬停提示，这里使用双指针算法找到当前position是否处于实体字符范围内
    if (isEmptyString(currentNode.tag) && offset >= nodeStartIndex && offset < nodeEndIndex) {
        let i = offset
        let j = offset + 1
        while (true) {
            let passed = 0
            if (i > nodeStartIndex && /[a-zA-Z\d;]/.test(source[i])) {
                i--, passed++
            }
            if (j <= nodeEndIndex && /[a-zA-Z\d;]/.test(source[j])) {
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
