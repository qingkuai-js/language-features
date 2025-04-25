import type {
    Range,
    Command,
    TextEdit,
    Position,
    CompletionItem,
    CompletionList
} from "vscode-languageserver-types"
import type {
    GetRangeFunc,
    CompileResult,
    ComponentAttributeItem
} from "../../../../../types/common"
import type {
    InsertSnippetFunc,
    GetComponentInfosFunc,
    GetScriptCompletionsFunc
} from "../../types/service"
import type { ProjectKind } from "../../constants"
import type { TemplateNode } from "qingkuai/compiler"
import type { HTMLElementDataAttributeItem } from "../../types/data"
import type { TextDocument } from "vscode-languageserver-textdocument"
import type { ComponentIdentifierInfo } from "../../../../../types/common"
import type { InsertSnippetParam } from "../../../../../types/communication"

import {
    slotTagData,
    findTagData,
    findValueSet,
    htmlElements,
    htmlDirectives,
    embeddedLangTags,
    getDocumentation,
    findTagAttributeData,
    getDirectiveDocumentation
} from "../../data/element"
import {
    findNodeAt,
    findAttribute,
    findEventModifier,
    formatImportStatement
} from "../../util/qingkuai"
import { util } from "qingkuai/compiler"
import { isPositionEqual } from "../../util/sundry"
import { eventModifiers } from "../../data/event-modifier"
import { createStyleSheetAndDocument } from "../../util/css"
import { getAndProcessScriptBlockCompletions } from "./script"
import { mdCodeBlockGen } from "../../../../../shared-util/docs"
import { htmlEntities, htmlEntitiesKeys } from "../../data/entity"
import { doComplete as _doEmmetComplete } from "@vscode/emmet-helper"
import { Commands, KEY_RELATED_EVENT_MODIFIERS } from "../../constants"
import { CompletionItemKind, InsertTextFormat } from "vscode-languageserver-types"
import { completeEntityCharacterRE, emmetTagNameRE, inEntityCharacterRE } from "../../regular"
import { isEmptyString, isNull, isString, isUndefined } from "../../../../../shared-util/assert"

export async function doComplete(
    cr: CompileResult,
    offset: number,
    trigger: string,
    document: TextDocument,
    isTestingEnv: boolean,
    projectKind: ProjectKind,
    insertSnippet: InsertSnippetFunc,
    getComponentInfos: GetComponentInfosFunc,
    getScriptCompletions: GetScriptCompletionsFunc
): Promise<CompletionList | CompletionItem[] | null> {
    const source = cr.inputDescriptor.source
    const { templateNodes, getRange, getPosition } = cr
    const currentNode = findNodeAt(templateNodes, offset - 1)

    // 输入结束标签的关闭字符>时不处于任何节点，直接返回
    if (isUndefined(currentNode)) {
        return null
    }

    if (!shouldComplete(cr, offset, trigger)) {
        return null
    }

    // 获取样式块的补全建议
    if (cr.isPositionFlagSet(offset, "inStyle")) {
        return doStyleBlockComplete(cr, offset)
    }

    // 转换脚本块（包括插值表达式）的补全建议
    if (cr.isPositionFlagSet(offset, "inScript")) {
        return getAndProcessScriptBlockCompletions(
            cr,
            offset,
            trigger,
            projectKind,
            getScriptCompletions
        )
    }

    // 文本节点范围内触发emmet、实体字符及自定义标签补全建议
    // 如果父节点结束标签未闭合且前两个字符为</，则自动闭合结束标签
    const componentInfos = await getComponentInfos(cr.filePath)
    if (isEmptyString(currentNode.tag)) {
        if (
            !isNull(currentNode.parent) &&
            currentNode.parent?.range[1] === -1 &&
            source.slice(offset - 2, offset) === "</"
        ) {
            return insertSnippet(`${currentNode.parent.tag}>`), null
        }

        const completions = [
            ...doCharacterEntityComplete(getRange, source, offset),
            ...doCustomTagComplete(cr, offset, currentNode, projectKind, componentInfos)
        ]

        // 如果是由<触发的补全建议获取，则列举所有标签名建议
        if (source[offset - 1] === "<") {
            completions.push(
                ...doTagComplete(
                    getRange(offset),
                    cr,
                    offset,
                    currentNode,
                    projectKind,
                    componentInfos
                )
            )
        }

        return completions.concat(doEmmetComplete(document, getPosition(offset))?.items ?? [])
    }

    // 下面的补全建议只能由这些自定义字符触发：!、@、#、&、>、=、|、-
    if (/[^!@#&>=\|\-\/]/.test(trigger)) {
        return null
    }

    const [nodeStartIndex, nodeEndIndex] = currentNode.range
    const startTagEndIndex = currentNode.startTagEndPos.index
    const tagNameEndIndex = nodeStartIndex + currentNode.tag.length + 1
    if (offset > nodeStartIndex + 1 && offset <= tagNameEndIndex) {
        return doTagComplete(
            getRange(nodeStartIndex + 1, tagNameEndIndex),
            cr,
            offset,
            currentNode,
            projectKind,
            componentInfos
        )
    }

    // 开始标签输入结束时自动插入结束标签
    if (
        nodeEndIndex === -1 &&
        currentNode.tag !== "!" &&
        source[offset - 1] === ">" &&
        offset === startTagEndIndex
    ) {
        return insertSnippet(`$0</${currentNode.tag}>`), null
    }

    // 自动插入注释节点的闭合文本
    if (currentNode.tag === "!") {
        if (source.slice(offset - 4) === "<!--") {
            insertSnippet("$0-->")
        }
        return null
    }

    // 计算并返回属性名称及属性值的补全建议（引用属性的补全建议列表单独处理，不使用htmlData中的数据）
    if (offset <= tagNameEndIndex || (offset >= startTagEndIndex && startTagEndIndex !== -1)) {
        return null
    }

    const attr = findAttribute(offset, currentNode)
    const attrKey = attr?.key.raw || ""
    const keyFirstChar = attrKey[0] || ""
    const isInterpolation = /[!@#&]/.test(keyFirstChar)
    const keyEndIndex = attr?.key.loc.end.index || offset
    const valueEndIndex = attr?.value.loc.end.index ?? -1
    const keyStartIndex = attr?.key.loc.start.index || offset
    const valueStartIndex = attr?.value.loc.start.index ?? Infinity

    // 当前节点若是组件，则找到它的属性信息
    const componentAttributes = componentInfos.find(info => {
        return info.name === currentNode.componentTag
    })?.attributes

    let hasValue = valueStartIndex !== Infinity && valueStartIndex !== -1

    // 如果上前一个字符为等号且不存在引号或大括号，则自动添加引号对或大括号对
    // 如果属性为非动态/引用/指令/事件且htmlData中该属性valueSet不为v或当前为组件节点则在次请求补全建议
    if (attr && valueStartIndex === attr.loc.end.index && source[offset - 1] === "=") {
        const snippetItem: InsertSnippetParam = {
            text: isInterpolation ? "{$0}" : '"$0"'
        }
        if (!isInterpolation) {
            let shouldTriggerSuggest = false
            if (componentAttributes) {
                const foundAttr = componentAttributes.find(attr => {
                    return attr.name === attrKey
                })
                shouldTriggerSuggest = !!foundAttr?.stringCandidates.length
            } else if (attrKey === "slot" && currentNode.parent?.componentTag) {
                shouldTriggerSuggest = true
            } else {
                const atttData = findTagAttributeData(currentNode.tag, attrKey)
                shouldTriggerSuggest = !!(atttData?.valueSet && atttData.valueSet !== "v")
            }
            if (shouldTriggerSuggest) {
                snippetItem.command = Commands.TriggerSuggest
            }
        }
        return insertSnippet(snippetItem), null
    }

    // 如果光标在属性值处，返回属性值的补全建议列表
    // 如果当前不处于任何属性范围内或者处于属性名范围内，则返回属性名补全建议列表
    if (attr && offset >= valueStartIndex && offset <= valueEndIndex) {
        if (!isInterpolation) {
            // 如果是在HTML属性内输入实体字符，则返回实体字符建议
            const characterEntityCompletions = doCharacterEntityComplete(getRange, source, offset)
            if (characterEntityCompletions.length > 0) {
                return characterEntityCompletions
            }

            const valueRange = getRange(valueStartIndex, valueEndIndex)
            if (attrKey === "slot" && currentNode.parent?.componentTag) {
                const componentInfo = componentInfos.find(info => {
                    return info.name === currentNode.parent!.componentTag
                })
                if (!componentInfo) {
                    return null
                }

                const existing = new Set<string>()
                currentNode.parent.children.forEach(child => {
                    const slotAttr = child.attributes.find(attr => {
                        return attr.key.raw === "slot"
                    })
                    if (slotAttr) {
                        existing.add(slotAttr.value.raw)
                    }
                })

                const filteredSlotNames = componentInfo.slotNams.filter(name => {
                    return !existing.has(name)
                })
                return filteredSlotNames.map(name => {
                    return {
                        label: name,
                        sortText: "!",
                        textEdit: {
                            newText: name,
                            range: valueRange
                        },
                        kind: CompletionItemKind.Constant
                    }
                })
            }

            // 当组件属性值为字符串字面量类型或字符串字面量联合类型时返回属性值建议
            if (componentAttributes) {
                const foundAttr = componentAttributes.find(attr => {
                    return attr.name === attrKey
                })
                return (foundAttr?.stringCandidates || []).map(candidate => {
                    return {
                        sortText: "!",
                        label: candidate,
                        kind: CompletionItemKind.Constant,
                        textEdit: {
                            range: valueRange,
                            newText: candidate
                        }
                    }
                })
            }

            // 返回普通标签属性值建议
            return doAttributeValueComplete(currentNode.tag, attrKey, valueRange)
        }
    } else if (isUndefined(attr) || offset <= keyEndIndex) {
        const prettierConfig = cr.config.prettierConfig
        const keyRange = getRange(keyStartIndex, keyEndIndex)
        const normalQuote = prettierConfig?.singleQuote ? "'" : '"'
        const useKebab =
            attrKey.includes("-") ||
            prettierConfig?.qingkuai.componentAttributeFormatPreference === "kebab"

        // 返回引用属性补全建议
        if (!isTestingEnv && keyFirstChar === "&") {
            if (currentNode.componentTag) {
                return doComponentAttributeNameComplete(
                    componentAttributes,
                    currentNode,
                    normalQuote,
                    "&",
                    useKebab,
                    keyRange
                )
            }

            return doReferenceAttributeComplete(currentNode, hasValue, keyRange)
        }

        // 如果处于事件修饰符范围内，则返回事件修饰符补全建议
        if (keyFirstChar === "@") {
            if (!isTestingEnv && currentNode.componentTag) {
                return doComponentAttributeNameComplete(
                    componentAttributes,
                    currentNode,
                    normalQuote,
                    "@",
                    useKebab,
                    keyRange
                )
            }

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

        if (!isTestingEnv && currentNode.componentTag) {
            return doComponentAttributeNameComplete(
                componentAttributes,
                currentNode,
                normalQuote,
                keyFirstChar,
                useKebab,
                keyRange
            )
        }

        return doAttributeNameComplete(currentNode, keyRange, hasValue, keyFirstChar)
    }

    return null
}

function shouldComplete(cr: CompileResult, offset: number, trigger: string) {
    if (cr.isPositionFlagSet(offset, "inStyle")) {
        return !trigger || /[#.\[:@ ]/.test(trigger)
    }
    if (cr.isPositionFlagSet(offset, "inScript")) {
        return !trigger || /[\.\-@#<'"`_\$]/.test(trigger)
    }
    return true
}

function doStyleBlockComplete(cr: CompileResult, offset: number) {
    const [languageService, ...params] = createStyleSheetAndDocument(cr, offset)
    return languageService.doComplete(...params, {
        completePropertyWithSemicolon: true,
        triggerPropertyValueCompletion: true
    })
}

// HTML实体字符补全建议
function doCharacterEntityComplete(getRange: GetRangeFunc, source: string, offset: number) {
    const ret: CompletionItem[] = []
    const matched = inEntityCharacterRE.exec(source.slice(offset))
    const entityStartIndex = source.slice(0, offset).search(completeEntityCharacterRE)

    if (entityStartIndex !== -1) {
        htmlEntitiesKeys.forEach(key => {
            const label = `&${key}`
            if (key.endsWith(";")) {
                ret.push({
                    label: label,
                    kind: CompletionItemKind.Keyword,
                    documentation: `Character entity representing ${htmlEntities[key]}`,
                    textEdit: {
                        newText: label,
                        range: getRange(entityStartIndex, offset + (matched?.[0].length || 0))
                    }
                })
            }
        })
    }
    return ret
}

// 自定义HTML标签补全建议（模拟emmet行为）
function doCustomTagComplete(
    cr: CompileResult,
    offset: number,
    node: TemplateNode,
    projectKind: ProjectKind,
    componentInfos: ComponentIdentifierInfo[]
) {
    const ret: CompletionItem[] = []
    const { source } = cr.inputDescriptor
    const emmetTagNameIndex = source.slice(0, offset).search(emmetTagNameRE)

    if (emmetTagNameIndex !== -1) {
        const startWithLT = source[emmetTagNameIndex] === "<"
        const startWithSpace = /\s/.test(source[emmetTagNameIndex])
        const useKebab =
            source.slice(emmetTagNameIndex, offset).includes("-") ||
            cr.config.prettierConfig?.componentTagFormatPreference === "kebab"
        const range = cr.getRange(emmetTagNameIndex + Number(startWithSpace || startWithLT), offset)

        // prettier-ignore
        if (isNull(node.parent)) {
            embeddedLangTags.forEach(({ name, description }) => {
                if(/[jt]s$/.test(name) && cr.inputDescriptor.script.existing){
                    return
                }
                ret.push({
                    label: name,
                    insertTextFormat: InsertTextFormat.Snippet,
                    textEdit:{
                        range,
                        newText: (startWithLT ? "" : "<") + name + (startWithLT ? "" : `>\n\t$0\n</${name}>`)
                    },
                    documentation: {
                        kind: "markdown",
                        value:
                            (isString(description) ? description : description.value) +
                            (startWithLT ? "" : "\n\n" + mdCodeBlockGen("qke", `<${name}>\n\t|\n</${name}>`))
                    }
                })
            })
        }

        // 为slot标签添加emmet支持
        if (!startWithLT) {
            ret.push({
                label: slotTagData.name,
                insertTextFormat: InsertTextFormat.Snippet,
                documentation: getDocumentation(slotTagData),
                textEdit: { range, newText: '<slot name="$1">$0</slot>' }
            })
        }

        // 上下文中以大写开头的标识符提示为组件标签
        util.getContextIdentifiers(node).forEach(identifier => {
            if (!/^[A-Z]/.test(identifier)) {
                return
            }
            const tag = useKebab ? util.camel2Kebab(identifier) : identifier
            ret.push({
                label: tag,
                insertTextFormat: InsertTextFormat.Snippet,
                textEdit: {
                    range,
                    newText: (startWithLT ? "" : "<") + tag + (startWithLT ? "" : `>$0</${tag}>`)
                }
            })
        })

        componentInfos.forEach(item => {
            let additionalTextEdits: TextEdit[] | undefined = undefined
            if (!item.imported) {
                const addImportIndex = Math.max(0, cr.inputDescriptor.script.loc.start.index)
                additionalTextEdits = [
                    {
                        range: cr.getRange(addImportIndex),
                        newText: formatImportStatement(
                            `import ${item.name} from ${JSON.stringify(item.relativePath)}`,
                            source,
                            [addImportIndex, addImportIndex],
                            projectKind,
                            cr.config.prettierConfig
                        )
                    }
                ]
            }

            const tag = useKebab ? util.camel2Kebab(item.name, false) : item.name

            // prettier-ignore
            ret.push({
                label: tag,
                additionalTextEdits,
                insertTextFormat: InsertTextFormat.Snippet,
                documentation: {
                    kind: "markdown",
                    value: mdCodeBlockGen("ts", `(component) class ${item.name}`)
                },
                detail: item.relativePath ? `Add import from "${item.relativePath}"` : undefined,
                textEdit: {
                    range,
                    newText: (startWithLT ? "" : "<") + tag + (startWithLT ? "" : item.slotNams.length ? `>$0</${tag}>` : ` $0 />`)
                },
            })
        })
    }

    return ret
}

// HTML标签补全建议
function doTagComplete(range: Range, ...restArgs: Parameters<typeof doCustomTagComplete>) {
    const ret = htmlElements.tags.map(item => {
        return {
            label: item.name,
            documentation: getDocumentation(item),
            textEdit: { range, newText: item.name }
        } as CompletionItem
    })
    return ret.concat(doCustomTagComplete(...restArgs))
}

// emmet支持，此方法会将特殊属性值（动态/引用属性、指令、事件名）转换为花括号包裹
// 注意：在emmet语法中，以感叹号开头的属性名是要被忽略的属性，qingkuai修改了这一语法（短横线-开头）
// 由于修改了默认语法，所以此修改并未提交给emmet，而是通过pnpm patch完成的，若之后版本升级需要重新打补丁
function doEmmetComplete(document: TextDocument, position: Position) {
    const ret = _doEmmetComplete(document, position, "html", {})
    ret?.items.forEach(item => {
        if (!item.textEdit) {
            return
        }

        // 在resolveCompletion中解析插入的文本
        item.data = {
            kind: "emmet"
        }

        // emmet bug: track和wbr标签是自闭合的，但emmet中会添加闭合标签
        if (item.label === "track" || item.label === "wbr") {
            item.textEdit.newText = item.textEdit.newText.replace(
                />\$\{0\}<\/(?:track|wbr|isindex)>$/,
                " />"
            )
        } else if (util.isSelfClosingTag(item.label)) {
            item.textEdit.newText = item.textEdit.newText.slice(0, -1) + " />"
        }
    })
    return ret
}

// HTML属性值补全建议
function doAttributeValueComplete(tag: string, attrName: string, range: Range) {
    const attrData = findTagAttributeData(tag, attrName)
    if (!isUndefined(attrData)) {
        return (
            findValueSet(attrData.valueSet || "")?.values.map(value => {
                return {
                    sortText: "!",
                    label: value.name,
                    kind: CompletionItemKind.Value,
                    documentation: getDocumentation(value),
                    textEdit: { range, newText: value.name }
                } as CompletionItem
            }) ?? null
        )
    }
    return null
}
function doComponentAttributeNameComplete(
    attributes: ComponentAttributeItem[] | undefined,
    node: TemplateNode,
    normalQuote: string,
    startChar: string,
    useKebab: boolean,
    range: Range
) {
    if (!attributes) {
        return null
    }

    const existing = new Set<string>()
    for (const item of node.attributes) {
        if (!isPositionEqual(item.loc.start, range.start)) {
            existing.add(util.kebab2Camel(item.key.raw.replace(/^[!@#&]/, "")))
        }
    }

    const completions: CompletionItem[] = []
    attributes?.forEach(attr => {
        if (existing.has(attr.name)) {
            return
        }

        const label = useKebab ? util.camel2Kebab(attr.name) : util.kebab2Camel(attr.name)
        const useStartChar =
            (startChar === "@" && attr.isEvent) ||
            (startChar === "&" && attr.kind === "Ref") ||
            (startChar === "!" && attr.kind === "Prop")

        if (useStartChar || (!/[!@&]/.test(startChar) && attr.kind === "Prop")) {
            const prefix = useStartChar ? startChar : ""

            let suffix = ""
            if (useStartChar) {
                suffix = "={$0}"
            } else if (!/boolean(?: \| undefined)?/.test(attr.type)) {
                suffix = `=${normalQuote}$0${normalQuote}`
            }

            let command: Command | undefined = undefined
            if (attr.stringCandidates.length) {
                command = {
                    title: "suggest",
                    command: Commands.TriggerSuggest
                }
            }

            completions.push({
                command,
                label: prefix + label,
                insertTextFormat: InsertTextFormat.Snippet,
                detail: `(property) ${attr.name}: ${attr.type}`,
                textEdit: { range, newText: prefix + label + suffix },
                kind: attr.isEvent ? CompletionItemKind.Event : CompletionItemKind.Property
            })
        }
    })
    return completions
}

// 获取引用属性名补全建议，普通标的引用属性签建议列表如下：
// input -> &value, radio/checkbox -> &value/checked，select -> &value
function doReferenceAttributeComplete(node: TemplateNode, hasValue: boolean, range: Range) {
    const recommend: string[] = []
    const existing = new Set<string>()
    for (const { key } of node.attributes) {
        if (key.raw.startsWith("&")) {
            existing.add(key.raw.slice(1))
        }
    }

    const extendRecommand = (...names: string[]) => {
        names.forEach(name => !existing.has(name) && recommend.push(name))
    }

    switch (node.tag) {
        case "select": {
            extendRecommand("value")
            break
        }
        case "input": {
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
                    extendRecommand("value")
                } else {
                    extendRecommand("checked", "group")
                }
            }
            break
        }
        default: {
            if (node.tag !== "slot" && node.tag !== "spread") {
                extendRecommand("dom")
            }
            break
        }
    }

    return recommend.map(attr => {
        return {
            label: "&" + attr,
            kind: CompletionItemKind.Property,
            insertTextFormat: InsertTextFormat.Snippet,
            textEdit: { range, newText: `&${attr}${hasValue ? "" : "={$0}"}` }
        } as CompletionItem
    })
}

// 事件修饰符补全建议
function doEventModifierComplete(existingItems: Set<string>, range: Range, key: string) {
    const ret: CompletionItem[] = []
    const keyRelatedEvents = new Set(["keyup", "keydown", "keypress"])
    const hasKeyRelatedModifier = Array.from(existingItems).some(modifier => {
        return KEY_RELATED_EVENT_MODIFIERS.has(modifier)
    })

    eventModifiers.forEach(item => {
        if (existingItems.has(item.name)) {
            return
        }
        if (key !== "input" && item.name === "compose") {
            return
        }
        if (KEY_RELATED_EVENT_MODIFIERS.has(item.name)) {
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
            textEdit: { range, newText: item.name }
        })
    })

    return ret
}

// HTML属性名补全建议
function doAttributeNameComplete(
    node: TemplateNode,
    range: Range,
    hasValue: boolean,
    startChar: string
) {
    const ret: CompletionItem[] = []
    const isEvent = startChar === "@"
    const isDynamic = startChar === "!"
    const existingEvents = new Set<string>()
    const existingAttributes = new Set<string>()
    const existingDirectives = new Set<string>()
    const isDynamicOrEvent = startChar && (isEvent || isDynamic)

    node.attributes.forEach(({ key }) => {
        if (isPositionEqual(key.loc.start, range.start)) {
            return
        }
        switch (key.raw[0]) {
            case "@":
                existingEvents.add(key.raw.slice(1))
                break
            case "#":
                existingDirectives.add(key.raw.slice(1))
                break
            default:
                const pureKey = key.raw.slice(+/^[!&]/.test(key.raw))
                if (node.componentTag || pureKey !== "class") {
                    existingAttributes.add(pureKey)
                } else {
                    existingAttributes.add(key.raw)
                }
                break
        }
    })

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
        if (
            !hasValue &&
            !isDynamicOrEvent &&
            (valueSet !== "v" || (attribute.name === "slot" && node.parent?.componentTag))
        ) {
            extraRet.command = {
                title: "suggest",
                command: Commands.TriggerSuggest
            }
        }
        return {
            ...extraRet,
            kind: CompletionItemKind.Property,
            textEdit: { range, newText: attribute.name + assignText }
        }
    }

    if (startChar !== "#") {
        const isDuplicate = (name: string) => {
            if (!isEvent) {
                if (node.componentTag || name !== "class") {
                    return existingAttributes.has(name)
                }
                return existingAttributes.has(startChar + name)
            }
            return existingEvents.has(name.replace(/^on/, ""))
        }

        // 查找指定标签的所有属性名作为补全建议
        findTagData(node.tag)?.attributes.forEach(attribute => {
            if (isDuplicate(attribute.name)) {
                return
            }
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
            if (isDuplicate(attribute.name)) {
                return
            }
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
        const unsetDirectives: string[] = []
        const sortTextMap: Record<string, number> = {}
        const prevExistingDirectives = new Set<string>()

        const isOneOfTheseExisting = (...names: string[]) => {
            return names.some(n => existingDirectives.has(n))
        }

        const setSortTextMap = (map: Record<string, number>) => {
            Object.assign(sortTextMap, map)
        }

        // 处理指令补全建议优先级，规则如下：
        // 前一个兄弟节点存在if或elif指令时提升elif和else指令的优先级
        // 前一个兄弟节点存在await及then指令时，只需提升catch指令的优先级
        // 前一个兄弟节点存在await但不存在then或catch指令时提升then和catch指令的优先级
        for (const attr of node.prev?.attributes || []) {
            if (attr.key.raw.startsWith("#")) {
                prevExistingDirectives.add(attr.key.raw.slice(1))
            }
        }
        if (prevExistingDirectives.has("if") || prevExistingDirectives.has("elif")) {
            setSortTextMap({ elif: 1, else: 2 })
        }
        if (prevExistingDirectives.has("await")) {
            if (prevExistingDirectives.has("then")) {
                setSortTextMap({ catch: 1 })
            } else if (!prevExistingDirectives.has("catch")) {
                setSortTextMap({ then: 1, catch: 2 })
            }
        }

        // 移除不能共存的指令的补全建议
        const resolveRelated = ["then", "catch"]
        const conditionRelated = ["if", "elif", "else"]
        if (isOneOfTheseExisting(...conditionRelated)) {
            unsetDirectives.push(...conditionRelated)
        }
        if (isOneOfTheseExisting(...resolveRelated)) {
            unsetDirectives.push(...resolveRelated)
        } else if (existingDirectives.has("await")) {
            setSortTextMap({ then: 1, catch: 2 })
        }

        // 如果属性名非动态非事件，则将所有指令添加到补全建议列表中
        // 指令名补全建议会有两种filterText，一种有#前缀，一种没有，这样做的好处就是无论
        // 用户有没有输入#前缀都会返回指令名补全建议，例如：#f和f都可以得到for指令的补全建议
        htmlDirectives.forEach(item => {
            if (
                !existingDirectives.has(item.name) &&
                !unsetDirectives.includes(item.name) &&
                (item.name !== "slot" || node.parent?.componentTag)
            ) {
                const label = "#" + item.name
                const noValue = hasValue || item.name === "else" || item.name === "html"
                const completion: CompletionItem = {
                    label: label,
                    filterText: label,
                    kind: CompletionItemKind.Keyword,
                    insertTextFormat: InsertTextFormat.Snippet,
                    sortText: "" + (sortTextMap[item.name] || "9"),
                    documentation: getDirectiveDocumentation(item, true),
                    textEdit: { range, newText: `${label}${noValue ? "" : "={$0}"}` }
                }
                if (item.name !== "slot") {
                    ret.push({ ...completion, filterText: item.name })
                }
                ret.push(completion)
            }
        })
    }

    return ret
}
