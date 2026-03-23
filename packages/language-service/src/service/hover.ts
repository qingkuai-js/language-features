import type { Hover } from "vscode-languageserver-types"
import type { CompileResult } from "../../../../types/common"
import type { GetComponentInfosFunc, GetCssConfigFunc, GetScriptHoverFunc } from "../types/service"

import {
    findTagNameRanges,
    findEventModifier,
    findTemplateNodeAt,
    findTemplateAttribute
} from "../util/qingkuai"
import {
    findTagData,
    htmlDirectives,
    getDocumentation,
    findTagAttributeData,
    getDirectiveDocumentation
} from "../data/element"
import { PositionFlag, util } from "qingkuai/compiler"
import { MarkupKind } from "vscode-languageserver-types"
import { eventModifiers } from "../data/event-modifier"
import { createStyleSheetAndDocument } from "../util/css"
import { mdCodeBlockGen } from "../../../../shared-util/docs"
import { htmlEntities, htmlEntitiesKeys } from "../data/entity"
import { isIndexesInvalid } from "../../../../shared-util/qingkuai"
import { isEmptyString, isUndefined } from "../../../../shared-util/assert"

export async function doHover(
    cr: CompileResult,
    offset: number,
    isTestingEnv: boolean,
    getCssConfig: GetCssConfigFunc,
    getScriptHover: GetScriptHoverFunc,
    getComponentInfos: GetComponentInfosFunc
): Promise<Hover | null> {
    const source = cr.document.getText()
    const currentNode = findTemplateNodeAt(cr.templateNodes, offset)
    if (!currentNode) {
        return null
    }

    if (cr.isPositionFlagSetAtIndex(PositionFlag.InScript, offset)) {
        const tsHoverTip = await getScriptHover!(cr.filePath, cr.getInterIndex(offset))
        if (!tsHoverTip) {
            return null
        }

        const sourceStart = cr.getSourceIndex(tsHoverTip.range[0])
        const sourceEnd = cr.getSourceIndex(tsHoverTip.range[1])
        if (isIndexesInvalid(sourceStart, sourceEnd)) {
            return null
        }
        return {
            contents: {
                kind: "markdown",
                value: tsHoverTip.content
            },
            range: cr.getVscodeRange(sourceStart, sourceEnd)
        }
    }

    if (cr.isPositionFlagSetAtIndex(PositionFlag.InStyle, offset)) {
        const [languageService, ...params] = createStyleSheetAndDocument(cr, offset)
        return languageService.doHover(...params, await getCssConfig(cr.uri))
    }

    // HTML标签悬停提示
    const nodeEndIndex = currentNode.loc.end.index
    const nodeStartIndex = currentNode.loc.start.index
    const tagNameRanges = findTagNameRanges(currentNode, offset)
    const tagTip = cr.config?.extensionConfig?.htmlHoverTip.includes("tag")
    if (tagTip && !isUndefined(tagNameRanges.start)) {
        const hoverRange = cr.getVscodeRange(
            ...tagNameRanges[offset <= tagNameRanges.start[1] ? "start" : "end"]!
        )
        if (!isTestingEnv && currentNode.componentTag) {
            for (const info of await getComponentInfos(cr.filePath)) {
                if (info.imported && info.name === currentNode.componentTag) {
                    return {
                        contents: {
                            kind: "markdown",
                            value: mdCodeBlockGen("ts", `${info.name} satisfies ${info.type}`)
                        },
                        range: hoverRange
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
    const attribute = findTemplateAttribute(offset, currentNode)
    if (attribute) {
        let attributeName = attribute.name.raw
        const nameEndIndex = attribute.name.loc.end.index
        const nameStartIndex = attribute.name.loc.start.index
        const attrTip = cr.config?.extensionConfig?.htmlHoverTip.includes("attribute")

        if (offset < nameStartIndex || offset >= nameEndIndex) {
            return null
        }

        // 指令名的提示单独处理
        if (attrTip && attributeName[0] === "#") {
            attributeName = attributeName.slice(1)
            for (const item of htmlDirectives) {
                if (attributeName === item.name) {
                    return {
                        range: cr.getVscodeRange(nameStartIndex, nameEndIndex),
                        contents: getDirectiveDocumentation(item, true)
                    }
                }
            }
            return null
        }

        if (!isTestingEnv && currentNode.componentTag) {
            const componentInfo = (await getComponentInfos(cr.filePath)).filter(info => {
                return info.name === currentNode.componentTag
            })[0]
            for (const attr of componentInfo?.attributes || []) {
                if (
                    (attributeName.startsWith("&") && attr.kind !== "Refs") ||
                    (!attributeName.startsWith("&") && attr.kind !== "Props")
                ) {
                    continue
                }
                if (attr.name === util.kebab2Camel(attributeName.replace(/^[!@&]/, ""))) {
                    const desc = `${attr.kind === "Refs" ? "reference " : ""}property`
                    return {
                        contents: {
                            kind: "markdown",
                            value: mdCodeBlockGen("ts", `(${desc}) ${attr.name}: ${attr.type}`)
                        },
                        range: cr.getVscodeRange(nameStartIndex, nameEndIndex)
                    }
                }
            }
            return null
        }

        if (!attrTip) {
            return null
        }

        // 动态/引用属性名去掉前方的!/&从数据查找提示消息
        if (/[!&]/.test(attributeName[0])) {
            attributeName = attributeName.slice(1)
        }

        // 事件名称将@替换为on从数据中查找提示消息，注意以下两点处理细节：
        // 1. 如果当前事件名中含有事件修饰符，则将事件名的结束为止缩小到第一个修饰符之前
        // 2. 如果当前指针放置的位置处于事件修饰符范围内，此时应该返回此事件修饰符的提示信息
        if (attributeName[0] === "@") {
            const firstModifierStartIndex = attributeName.indexOf("|")
            if (
                firstModifierStartIndex === -1 ||
                offset < firstModifierStartIndex + nameStartIndex
            ) {
                if (firstModifierStartIndex === -1) {
                    attributeName = "on" + attributeName.slice(1)
                } else {
                    attributeName = "on" + attributeName.slice(1, firstModifierStartIndex)
                }
            } else {
                const modifier = findEventModifier(source, offset, [nameStartIndex, nameEndIndex])
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
                            range: cr.getVscodeRange(...modifier.range)
                        }
                    }
                }
                return null
            }
        }

        const attrData = findTagAttributeData(currentNode.tag, attributeName)
        if (isUndefined(attrData)) {
            return null
        }
        return {
            contents: getDocumentation(attrData),
            range: cr.getVscodeRange(nameStartIndex, nameEndIndex)
        }
    }

    // HTML实体字符悬停提示
    if (
        offset < nodeEndIndex &&
        offset >= nodeStartIndex &&
        isEmptyString(currentNode.tag) &&
        cr.config?.extensionConfig?.htmlHoverTip.includes("entity")
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
                        range: cr.getVscodeRange(startIndex, endIndex),
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
