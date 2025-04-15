import type { Hover } from "vscode-languageserver-types"
import type { CompileResult } from "../../../../types/common"
import type { GetCssConfigFunc, GetScriptHoverFunc } from "../types/service"

import {
    findTagData,
    htmlDirectives,
    getDocumentation,
    findTagAttributeData,
    getDirectiveDocumentation
} from "../data/element"
import { util } from "qingkuai/compiler"
import { MarkupKind } from "vscode-languageserver-types"
import { eventModifiers } from "../data/event-modifier"
import { createStyleSheetAndDocument } from "../util/css"
import { mdCodeBlockGen } from "../../../../shared-util/docs"
import { htmlEntities, htmlEntitiesKeys } from "../data/entity"
import { isIndexesInvalid } from "../../../../shared-util/qingkuai"
import { isEmptyString, isUndefined } from "../../../../shared-util/assert"
import { findAttribute, findEventModifier, findNodeAt, findTagRanges } from "../util/qingkuai"

export async function doHover(
    cr: CompileResult,
    offset: number,
    isTestingEnv: boolean,
    getCssConfig: GetCssConfigFunc,
    getScriptHover: GetScriptHoverFunc
): Promise<Hover | null> {
    const source = cr.inputDescriptor.source
    const currentNode = findNodeAt(cr.templateNodes, offset)
    if (!currentNode) {
        return null
    }

    if (cr.isPositionFlagSet(offset, "inScript")) {
        const tsHoverTip = await getScriptHover!(cr.filePath, cr.getInterIndex(offset))
        if (!tsHoverTip) {
            return null
        }

        const ss = cr.getSourceIndex(tsHoverTip.posRange[0])
        const se = cr.getSourceIndex(tsHoverTip.posRange[1], true)
        if (isIndexesInvalid(ss, se)) {
            return null
        }
        return {
            contents: {
                kind: "markdown",
                value: tsHoverTip.content
            },
            range: cr.getRange(ss, se)
        }
    }

    if (cr.isPositionFlagSet(offset, "inStyle")) {
        const [languageService, ...params] = createStyleSheetAndDocument(cr, offset)
        return languageService.doHover(...params, await getCssConfig(cr.uri))
    }

    // HTML标签悬停提示
    const tagRanges = findTagRanges(currentNode, offset)
    const [nodeStartIndex, nodeEndIndex] = currentNode.range
    const tagTip = cr.config.extensionConfig?.htmlHoverTip.includes("tag")
    if (tagTip && !isUndefined(tagRanges[0])) {
        const isStart = offset <= tagRanges[0][1]
        const hoverRange = cr.getRange(...tagRanges[isStart ? 0 : 1]!)

        if (!isTestingEnv && currentNode.componentTag) {
            for (const info of cr.componentInfos) {
                if (info.name === currentNode.componentTag) {
                    return {
                        range: hoverRange,
                        contents: {
                            kind: "markdown",
                            value: mdCodeBlockGen(
                                "ts",
                                `(component) class ${currentNode.componentTag}`
                            )
                        }
                    }
                }
            }
            return null
        }

        const tagData = findTagData(currentNode.tag)
        if (isUndefined(tagData)) {
            return null
        }
        return {
            range: hoverRange,
            contents: getDocumentation(tagData)
        }
    }

    // HTML属性名悬停提示
    const attribute = findAttribute(offset, currentNode)
    if (attribute) {
        let attrKey = attribute.key.raw
        const KeyEndIndex = attribute.key.loc.end.index
        const keyStartIndex = attribute.key.loc.start.index
        const attrTip = cr.config.extensionConfig?.htmlHoverTip.includes("attribute")

        if (offset < keyStartIndex || offset >= KeyEndIndex) {
            return null
        }

        // 指令名的提示单独处理
        if (attrTip && attrKey[0] === "#") {
            attrKey = attrKey.slice(1)
            for (const item of htmlDirectives) {
                if (attrKey === item.name) {
                    return {
                        range: cr.getRange(keyStartIndex, KeyEndIndex),
                        contents: getDirectiveDocumentation(item, true)
                    }
                }
            }
            return null
        }

        if (!isTestingEnv && currentNode.componentTag) {
            const componentInfo = cr.componentInfos.filter(info => {
                return info.name === currentNode.componentTag
            })[0]
            for (const attr of componentInfo?.attributes || []) {
                if (
                    (attrKey.startsWith("&") && attr.kind !== "Ref") ||
                    (!attrKey.startsWith("&") && attr.kind !== "Prop")
                ) {
                    continue
                }
                if (attr.name === util.kebab2Camel(attrKey.replace(/^[!@&]/, ""))) {
                    const desc = `${attr.kind === "Ref" ? "reference " : ""}property`
                    return {
                        contents: {
                            kind: "markdown",
                            value: mdCodeBlockGen("ts", `(${desc}) ${attr.name}: ${attr.type}`)
                        },
                        range: cr.getRange(keyStartIndex, KeyEndIndex)
                    }
                }
            }
            return null
        }

        if (!attrTip) {
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
                            range: cr.getRange(...modifier.range)
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
            range: cr.getRange(keyStartIndex, KeyEndIndex)
        }
    }

    // HTML实体字符悬停提示
    if (
        offset < nodeEndIndex &&
        offset >= nodeStartIndex &&
        isEmptyString(currentNode.tag) &&
        cr.config.extensionConfig?.htmlHoverTip.includes("entity")
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
                        range: cr.getRange(startIndex, endIndex),
                        contents: {
                            kind: MarkupKind.Markdown,
                            value: `Character entity representing: ${entityItem}\n\nUnicode equivalent: U+${unicodeStr}`
                        }
                    }
                }
            }
        }
    }
    return null
}
