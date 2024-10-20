import type { HoverHander } from "../types/handlers"

import {
    findTagData,
    htmlDirectives,
    getDocumentation,
    findTagAttributeData,
    getDirectiveDocumentation
} from "../data/html"
import { getCompileRes } from "../state"
import { isUndefined } from "../../../../shared-util/assert"
import { findAttribute, findNodeAt } from "../util/qingkuai"

export const hover: HoverHander = ({ textDocument, position }) => {
    const { templateNodes, getOffset, getRange } = getCompileRes(textDocument, position)!

    const offset = getOffset(position)
    const currentNode = findNodeAt(templateNodes, offset)
    if (!currentNode) {
        return null
    }

    let tagStartIndex = -1
    const tagLen = currentNode.tag.length
    const nodestartIndex = currentNode.loc.start.index + 1
    const endTagStartIndex = currentNode.endTagStartPos.index + 2
    if (offset >= nodestartIndex && offset < nodestartIndex + tagLen) {
        tagStartIndex = nodestartIndex
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
}
