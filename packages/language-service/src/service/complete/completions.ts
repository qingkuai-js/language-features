import type {
    CompileResult,
    GetVscodeRangeFunc,
    ComponentAttributeItem
} from "../../../../../types/common"
import type {
    InsertSnippetFunc,
    GetComponentInfosFunc,
    GetScriptCompletionsFunc
} from "../../types/service"
import {
    Range,
    TextEdit,
    Position,
    CompletionItem,
    CompletionList
} from "vscode-languageserver-types"
import type {
    InsertSnippetParams,
    GetClientLanguageConfigResult
} from "../../../../../types/communication"
import type { ComponentInfo } from "../../../../../types/common"
import type { CompletionTriggerKind } from "vscode-languageserver"
import type { HTMLElementDataAttributeItem } from "../../types/data"
import type { ProjectKind } from "../../../../../shared-util/constant"
import type { TextDocument } from "vscode-languageserver-textdocument"
import type { TemplateAttribute, TemplateNode } from "qingkuai/compiler"

import {
    slotTagData,
    findTagData,
    builtInTags,
    findValueSet,
    htmlElements,
    htmlDirectives,
    embeddedLangTags,
    getDocumentation,
    isBooleanAttribute,
    findTagAttributeData,
    getDirectiveDocumentation
} from "../../data/element"
import {
    findEventModifier,
    findTemplateNodeAt,
    findTemplateAttribute,
    formatImportStatement,
    findTextContentPartAt
} from "../../util/qingkuai"
import {
    emmetTagNameRE,
    nonWhitespaceRE,
    inEntityCharacterRE,
    completeEntityCharacterRE
} from "../../regular"
import { QingkuaiCommands } from "../../enums"
import { isPositionEqual } from "../../util/sundry"
import { QK_HASH_DOC } from "../../data/css-attribute"
import { PositionFlag, util } from "qingkuai/compiler"
import { eventModifiers } from "../../data/event-modifier"
import { getAndProcessScriptBlockCompletions } from "./script"
import { mdCodeBlockGen } from "../../../../../shared-util/docs"
import { htmlEntities, htmlEntitiesKeys } from "../../data/entity"
import { constants as qingkuaiConstants } from "qingkuai/compiler"
import { doComplete as _doEmmetComplete } from "@vscode/emmet-helper"
import { CompletionItemKind, InsertTextFormat } from "vscode-languageserver-types"
import { createStyleSheetAndDocument, findStyleSheetNodeAt } from "../../util/css"
import { KEY_RELATED_EVENT_MODIFIERS, RETRIGGER_SUGGEST_COMMAND } from "../../constants"
import { isEmptyString, isNull, isString, isUndefined } from "../../../../../shared-util/assert"

export async function doComplete(
    cr: CompileResult,
    offset: number,
    trigger: string,
    isTestingEnv: boolean,
    projectKind: ProjectKind,
    insertSnippet: InsertSnippetFunc,
    getComponentInfos: GetComponentInfosFunc,
    getScriptCompletions: GetScriptCompletionsFunc,
    triggerKind: CompletionTriggerKind | undefined
): Promise<CompletionList | CompletionItem[] | null> {
    const config = cr.config!
    const source = cr.document.getText()
    const position = cr.document.positionAt(offset)
    const surroundingNode = findTemplateNodeAt(cr.templateNodes, offset - 1)

    // 输入结束标签的关闭字符>时不处于任何节点，直接返回
    if (isUndefined(surroundingNode)) {
        return null
    }

    if (!shouldComplete(cr, offset, trigger)) {
        return null
    }

    // 获取样式块的补全建议
    if (cr.isPositionFlagSetAtIndex(PositionFlag.InStyle, offset)) {
        if (trigger === " ") {
            return null
        }
        return doStyleBlockComplete(cr, offset)
    }
    if (trigger === "[") {
        return null
    }

    // 转换脚本块（包括插值表达式）的补全建议
    if (cr.isPositionFlagSetAtIndex(PositionFlag.InScript, offset)) {
        const list = await getAndProcessScriptBlockCompletions(
            cr,
            offset,
            trigger,
            projectKind,
            triggerKind,
            getScriptCompletions
        )

        // 文本插值块前为非空白字符则添加 emmet 补全建议
        if (isEmptyString(surroundingNode.tag)) {
            const currentTextContentPart = findTextContentPartAt(surroundingNode, offset)
            const prevTextContentPart = surroundingNode.content.find((_, index) => {
                return surroundingNode.content[index + 1] === currentTextContentPart
            })
            if (
                prevTextContentPart &&
                nonWhitespaceRE.test(
                    prevTextContentPart.value[prevTextContentPart.value.length - 1]
                )
            ) {
                const emmetCompletionItems = doEmmetComplete(cr.document, position)?.items
                if (emmetCompletionItems) {
                    if (!list) {
                        return emmetCompletionItems
                    }
                    list.items.push(...emmetCompletionItems)
                }
            }
        }
        return list
    }

    // 文本节点范围内触发emmet、实体字符及自定义标签补全建议
    // 如果父节点结束标签未闭合且前两个字符为</，则自动闭合结束标签
    const componentInfos = await getComponentInfos(cr.filePath)
    if (isEmptyString(surroundingNode.tag)) {
        if (
            !isNull(surroundingNode.parent) &&
            surroundingNode.parent.loc.end.index === -1 &&
            source.slice(offset - 2, offset) === "</"
        ) {
            return (insertSnippet(`${surroundingNode.parent.tag}>`), null)
        }

        const completions = [
            ...doCharacterEntityComplete(cr.getVscodeRange, source, offset),
            ...(await doCustomTagComplete(
                cr,
                offset,
                surroundingNode,
                projectKind,
                config,
                componentInfos
            ))
        ]

        // 如果是由<触发的补全建议获取，则列举所有标签名建议
        if (source[offset - 1] === "<") {
            completions.push(
                ...(await doTagComplete(
                    cr.getVscodeRange(offset),
                    cr,
                    offset,
                    surroundingNode,
                    projectKind,
                    config,
                    componentInfos
                ))
            )
        }

        return {
            isIncomplete: true,
            items: completions.concat(
                doEmmetComplete(cr.document, cr.document.positionAt(offset))?.items ?? []
            )
        }
    }

    // 下面的补全建议只能由这些自定义字符触发：!、@、#、&、>、=、|、-、'、"、{、0-9
    if (/[^!@#&>='"\|\-\/\{0-9]/.test(trigger)) {
        return null
    }

    const nodeStartIndex = surroundingNode.loc.start.index
    const startTagEndIndex = surroundingNode.startTagEndPos.index
    const tagNameEndIndex = nodeStartIndex + surroundingNode.tag.length + 1
    if (offset > nodeStartIndex + 1 && offset <= tagNameEndIndex) {
        const range = cr.getVscodeRange(nodeStartIndex + 1, tagNameEndIndex)
        return doTagComplete(
            range,
            cr,
            offset,
            surroundingNode,
            projectKind,
            config,
            componentInfos
        )
    }

    // 开始标签输入结束时自动插入结束标签
    if (
        surroundingNode.tag !== "!" &&
        source[offset - 1] === ">" &&
        offset === startTagEndIndex &&
        !hasMatchedEndTag(surroundingNode)
    ) {
        return (insertSnippet(`$0</${surroundingNode.tag}>`), null)
    }

    // 计算并返回属性名称及属性值的补全建议（引用属性的补全建议列表单独处理，不使用htmlData中的数据）
    if (offset <= tagNameEndIndex || (offset >= startTagEndIndex && startTagEndIndex !== -1)) {
        return null
    }

    const surroundingAttribute = findTemplateAttribute(offset, surroundingNode)
    const attrName = surroundingAttribute?.name.raw || ""
    const nameFirstChar = attrName[0] || ""
    const isInterpolation = /[!@#&]/.test(nameFirstChar)
    const valueEndIndex = surroundingAttribute?.value.loc.end.index ?? -1
    const nameEndIndex = surroundingAttribute?.name.loc.end.index || offset
    const nameStartIndex = surroundingAttribute?.name.loc.start.index || offset
    const valueStartIndex = surroundingAttribute?.value.loc.start.index ?? Infinity

    // 当前节点若是组件，则找到它的属性信息
    const componentAttributes = componentInfos.find(info => {
        return info.name === surroundingNode.componentTag
    })?.attributes

    let hasValue = valueStartIndex !== Infinity && valueStartIndex !== -1

    // 如果上前一个字符为等号且不存在引号或大括号，则自动添加引号对或大括号对
    // 如果上一个字符为引号或开始大括号，且不存在对应的结束字符，则插入对应的结束字符
    // 对于静态属性且 htmlData 中该属性 valueSet 不为 v 或当前为组件节点则在次请求补全建议
    if (
        surroundingAttribute &&
        ((/['"\{]/.test(source[offset - 1]) && surroundingAttribute.loc.end.index === -1) ||
            (surroundingAttribute.valueEnclosure === "none" && source[offset - 1] === "="))
    ) {
        const snippetItem: InsertSnippetParams = {
            text: ""
        }
        if (source[offset - 1] === "=") {
            const quote = config.prettierConfig?.singleQuote ? "'" : '"'
            snippetItem.text = isInterpolation ? "{$0}" : `${quote}$0${quote}`
        } else {
            snippetItem.text = isInterpolation ? "$0}" : `$0${source[offset - 1]}`
        }
        if (!isInterpolation) {
            let shouldRetriggerSuggest = false
            if (componentAttributes) {
                const foundAttr = componentAttributes.find(attr => {
                    return attr.name === attrName
                })
                shouldRetriggerSuggest = !!foundAttr?.stringCandidates.length
            } else if (attrName === "slot" && surroundingNode.parent?.componentTag) {
                shouldRetriggerSuggest = true
            } else {
                const atttData = findTagAttributeData(surroundingNode.tag, attrName)
                shouldRetriggerSuggest = !!(atttData?.valueSet && atttData.valueSet !== "v")
            }
            if (shouldRetriggerSuggest) {
                snippetItem.command = QingkuaiCommands.TriggerSuggest
            }
        }
        return (insertSnippet(snippetItem), null)
    }

    // 如果光标在属性值处，返回属性值的补全建议列表
    // 如果当前不处于任何属性范围内或者处于属性名范围内，则返回属性名补全建议列表
    if (surroundingAttribute && offset >= valueStartIndex && offset <= valueEndIndex) {
        if (!isInterpolation) {
            // 如果是在HTML属性内输入实体字符，则返回实体字符建议
            const characterEntityCompletions = doCharacterEntityComplete(
                cr.getVscodeRange,
                source,
                offset
            )
            const valueRange = cr.getVscodeRange(valueStartIndex, valueEndIndex)

            if (characterEntityCompletions.length > 0) {
                return characterEntityCompletions
            }

            // 当组件属性值为字符串字面量类型或字符串字面量联合类型时返回属性值建议
            if (componentAttributes) {
                const foundAttr = componentAttributes.find(attr => {
                    return attr.name === attrName
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
            return doAttributeValueComplete(surroundingNode.tag, attrName, valueRange)
        }
    } else if (
        !/['"]/.test(trigger) &&
        (isUndefined(surroundingAttribute) || offset <= nameEndIndex)
    ) {
        const prettierConfig = config.prettierConfig
        const normalQuote = prettierConfig?.singleQuote ? "'" : '"'
        const nameRange = cr.getVscodeRange(nameStartIndex, nameEndIndex)
        const useKebab =
            attrName.includes("-") ||
            prettierConfig?.qingkuai.componentAttributeFormatPreference === "kebab"

        // 返回引用属性补全建议
        if (!isTestingEnv && nameFirstChar === "&") {
            if (surroundingNode.componentTag) {
                return doComponentAttributeNameComplete(
                    componentAttributes,
                    surroundingAttribute,
                    surroundingNode,
                    normalQuote,
                    "&",
                    useKebab,
                    nameRange
                )
            }

            return doReferenceAttributeComplete(cr, surroundingNode, hasValue, nameRange)
        }

        // 如果处于事件修饰符范围内，则返回事件修饰符补全建议
        if (nameFirstChar === "@") {
            if (!isTestingEnv && surroundingNode.componentTag) {
                return doComponentAttributeNameComplete(
                    componentAttributes,
                    surroundingAttribute,
                    surroundingNode,
                    normalQuote,
                    "@",
                    useKebab,
                    nameRange
                )
            }

            const firstModifierStartIndex = attrName.indexOf("|")
            const modifier = findEventModifier(source, offset, [nameStartIndex, nameEndIndex])

            // 已经存在的修饰符不再提示（注意：如果光标在这个存在的修饰符范围内，需要重新提醒，这种情况多发生在
            // 用户主动调用客户端命令来获取补全建议时（vscode对应的命令：editor.action.triggerSuggest）
            if (!isUndefined(modifier)) {
                const existingItems = new Set<string>()
                const items = attrName.slice(firstModifierStartIndex).split("|")
                for (
                    let i = 0, j = nameStartIndex + firstModifierStartIndex;
                    i < items.length;
                    i++
                ) {
                    if (offset < j || offset >= (j += items[i].length + 1)) {
                        existingItems.add(items[i])
                    }
                }
                return doEventModifierComplete(
                    existingItems,
                    cr.getVscodeRange(...modifier.range),
                    attrName.slice(1, firstModifierStartIndex)
                )
            }

            // 如果属性名之后存在修饰符，就不会自动插入等号和大括号
            if (firstModifierStartIndex !== -1) {
                hasValue = true
                nameRange.end = cr.document.positionAt(nameStartIndex + firstModifierStartIndex)
            }
        }

        if (!isTestingEnv && surroundingNode.componentTag) {
            return doComponentAttributeNameComplete(
                componentAttributes,
                surroundingAttribute,
                surroundingNode,
                normalQuote,
                nameFirstChar,
                useKebab,
                nameRange
            )
        }

        return doAttributeNameComplete(surroundingNode, nameRange, hasValue, nameFirstChar)
    }

    return null
}

function shouldComplete(cr: CompileResult, offset: number, trigger: string) {
    if (cr.isPositionFlagSetAtIndex(PositionFlag.InStyle, offset)) {
        return !trigger || /[#.\[:@ ]/.test(trigger)
    }
    if (cr.isPositionFlagSetAtIndex(PositionFlag.InScript, offset)) {
        return !trigger || /[\.\-@#<'"`_\$]/.test(trigger)
    }
    return true
}

function doStyleBlockComplete(cr: CompileResult, offset: number) {
    const [languageService, document, position, styleSheet] = createStyleSheetAndDocument(
        cr,
        offset
    )
    const styleDocumentOffset = document.offsetAt(position)
    const surroundingNode = findStyleSheetNodeAt(styleSheet, styleDocumentOffset)
    for (let currentNode = surroundingNode; currentNode; ) {
        if (/** AttributeSelector */ 18 === currentNode.type) {
            const startPosition = document.positionAt(surroundingNode.offset)
            const endPosition = document.positionAt(surroundingNode.offset + surroundingNode.length)
            return [
                {
                    documentation: {
                        kind: "markdown",
                        value: QK_HASH_DOC
                    },
                    textEdit:
                        currentNode !== surroundingNode
                            ? TextEdit.replace(
                                  {
                                      start: startPosition,
                                      end: endPosition
                                  },
                                  "qk-hash"
                              )
                            : TextEdit.insert(endPosition, "qk-hash"),
                    label: "qk-hash"
                } satisfies CompletionItem
            ]
        }
        currentNode = currentNode.parent
    }
    return languageService.doComplete(document, position, styleSheet, {
        completePropertyWithSemicolon: true,
        triggerPropertyValueCompletion: true
    })
}

// HTML实体字符补全建议
function doCharacterEntityComplete(getRange: GetVscodeRangeFunc, source: string, offset: number) {
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
async function doCustomTagComplete(
    cr: CompileResult,
    offset: number,
    node: TemplateNode,
    projectKind: ProjectKind,
    config: GetClientLanguageConfigResult,
    componentInfos: ComponentInfo[]
) {
    const ret: CompletionItem[] = []
    const source = cr.document.getText()
    const parentIsComponent = !!node.parent?.componentTag
    const emmetTagNameIndex = source.slice(0, offset).search(emmetTagNameRE)

    if (emmetTagNameIndex !== -1) {
        const startWithLT = source[emmetTagNameIndex] === "<"
        const startWithSpace = /\s/.test(source[emmetTagNameIndex])
        const range = cr.getVscodeRange(
            emmetTagNameIndex + Number(startWithSpace || startWithLT),
            offset
        )
        const useKebab =
            source.slice(emmetTagNameIndex, offset).includes("-") ||
            config.prettierConfig?.componentTagFormatPreference === "kebab"

        if (isNull(node.parent)) {
            embeddedLangTags.forEach(({ name, description }) => {
                if (cr.scriptDescriptor.existing && /[jt]s$/.test(name)) {
                    return
                }
                ret.push({
                    textEdit: {
                        range,
                        newText:
                            (startWithLT ? "" : "<") +
                            name +
                            (startWithLT ? "" : `>\n\t$0\n</${name}>`)
                    },
                    documentation: {
                        kind: "markdown",
                        value:
                            (isString(description) ? description : description.value) +
                            (startWithLT
                                ? ""
                                : "\n\n" + mdCodeBlockGen("qke", `<${name}>\n\t|\n</${name}>`))
                    },
                    label: name,
                    insertTextFormat: InsertTextFormat.Snippet
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

        // 为内置元素添加emmet支持

        builtInTags.forEach(({ name, description }) => {
            const quote = config!.prettierConfig?.singleQuote ? "'" : '"'
            const attr = parentIsComponent ? ` name=${quote}$1${quote}` : " #$1"
            ret.push({
                textEdit: {
                    range,
                    newText:
                        (startWithLT ? "" : "<") +
                        name +
                        (startWithLT ? "" : `${attr}>\n\t$0\n</${name}>`)
                },
                documentation: {
                    kind: "markdown",
                    value: description as string
                },
                label: name,
                insertTextFormat: InsertTextFormat.Snippet,
                command: parentIsComponent ? undefined : RETRIGGER_SUGGEST_COMMAND
            })
        })

        // 上下文中以大写开头的标识符提示为组件标签
        Object.keys(cr.getTemplateNodeContext(node).contextIdentifiers).forEach(identifier => {
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

        for (const item of componentInfos) {
            let detail: string | undefined = undefined
            let additionalTextEdits: TextEdit[] | undefined = undefined
            if (!item.imported) {
                const addImportIndex = Math.max(0, cr.scriptDescriptor.loc.start.index)
                additionalTextEdits = [
                    {
                        range: cr.getVscodeRange(addImportIndex),
                        newText: formatImportStatement(
                            `import ${item.name} from ${JSON.stringify(item.relativePath)}`,
                            source,
                            [addImportIndex, addImportIndex],
                            projectKind,
                            config!.prettierConfig
                        )
                    }
                ]
                detail = `Add import from "${item.relativePath}"\n\n(property): default: ${item.type}`
            }

            const tag = useKebab ? util.camel2Kebab(item.name, false) : item.name
            ret.push({
                textEdit: {
                    range,
                    newText:
                        (startWithLT ? "" : "<") +
                        tag +
                        (startWithLT ? "" : item.slotNames.length ? `>$0</${tag}>` : ` $0 />`)
                },
                detail,
                label: tag,
                additionalTextEdits,
                insertTextFormat: InsertTextFormat.Snippet
            })
        }
    }

    return ret
}

// HTML标签补全建议
async function doTagComplete(range: Range, ...restArgs: Parameters<typeof doCustomTagComplete>) {
    const ret = htmlElements.tags.map(item => {
        return {
            label: item.name,
            documentation: getDocumentation(item),
            textEdit: { range, newText: item.name }
        } as CompletionItem
    })
    return ret.concat(await doCustomTagComplete(...restArgs))
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
    componentAttributes: ComponentAttributeItem[] | undefined,
    surroundingAttribute: TemplateAttribute | undefined,
    node: TemplateNode,
    normalQuote: string,
    startChar: string,
    useKebab: boolean,
    range: Range
) {
    if (!componentAttributes?.length) {
        return null
    }

    const existing = new Set<string>()
    const completions: CompletionItem[] = []
    const isInterpolated = startChar === "!" || startChar === "@" || startChar === "&"

    for (const item of node.attributes) {
        if (!isPositionEqual(item.loc.start, range.start)) {
            existing.add(util.kebab2Camel(item.name.raw.replace(/^[!@]/, "")))
        }
    }

    componentAttributes.forEach(componentAttr => {
        if (existing.has(componentAttr.name)) {
            return
        }

        // 请求事件的补全建议时，只返回属性值类型可能为事件的项目
        if (startChar === "@" && !componentAttr.mayBeEvent) {
            return
        }

        // 当属性值类型不是字符串时不提供静态类型补全建议
        if (!isInterpolated && (componentAttr.kind === "Refs" || !componentAttr.couldBeString)) {
            return
        }

        let valueSnippet = ""
        const formattedName = useKebab
            ? util.camel2Kebab(componentAttr.name)
            : util.kebab2Camel(componentAttr.name)
        const label = (isInterpolated ? startChar : "") + formattedName
        if (!surroundingAttribute?.equalSign) {
            if (isInterpolated) {
                valueSnippet = "={$1}"
            } else if (!/boolean(?: \| undefined)?/.test(componentAttr.type)) {
                valueSnippet = `=${normalQuote}$1${normalQuote}`
            }
        }
        completions.push({
            filterText: label,
            insertTextFormat: InsertTextFormat.Snippet,
            textEdit: { range, newText: label + valueSnippet },
            label: `${label}${componentAttr.optional ? "?" : ""}`,
            detail: `(property) ${componentAttr.name}: ${componentAttr.type}`,
            command: componentAttr.stringCandidates.length ? RETRIGGER_SUGGEST_COMMAND : undefined,
            kind: componentAttr.mayBeEvent ? CompletionItemKind.Event : CompletionItemKind.Property
        })
    })
    return completions
}

// 获取引用属性名补全建议，普通标的引用属性签建议列表如下：
// input -> &value, checkbox -> &value/checked，select -> &value
function doReferenceAttributeComplete(
    cr: CompileResult,
    node: TemplateNode,
    hasValue: boolean,
    range: Range
) {
    const recommend: string[] = []
    const existing = new Set<string>()
    const nodeContext = cr.getTemplateNodeContext(node)
    for (const attribute of nodeContext.referenceAttributes) {
        existing.add(attribute.name.raw.slice(1))
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
            extendRecommand("value", "checked", "group", "number")
            break
        }
        default: {
            if (
                !node.componentTag &&
                node.tag !== "slot" &&
                node.tag !== qingkuaiConstants.SPREAD_TAG
            ) {
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

    for (const { name: attributeName } of node.attributes) {
        if (isPositionEqual(attributeName.loc.start, range.start)) {
            continue
        }
        switch (attributeName.raw[0]) {
            case "@":
                existingEvents.add(attributeName.raw.slice(1))
                break
            case "#":
                existingDirectives.add(attributeName.raw.slice(1))
                break
            default:
                const baseName = attributeName.raw.slice(+/^[!&]/.test(attributeName.raw))
                if (node.componentTag || baseName !== "class") {
                    existingAttributes.add(baseName)
                } else {
                    existingAttributes.add(attributeName.raw)
                }
                break
        }
    }

    // 获取属性名补全建议的附加属性（标签属性名和全局属性名通用方法），此方法会根据条件添加
    // 插入范围属性，选中该建议后是否再次触发补全建议的command属性以及插入格式属性（Snippet）
    const getExtra = (attribute: HTMLElementDataAttributeItem) => {
        let assignText = ""
        const valueSet = attribute.valueSet || "v"
        const extraRet: Partial<CompletionItem> = {}
        if (!hasValue && !isBooleanAttribute(node.tag, attribute)) {
            assignText = isDynamicOrEvent ? "={$0}" : '="$0"'
            extraRet.insertTextFormat = InsertTextFormat.Snippet
        }
        if (
            !hasValue &&
            !isDynamicOrEvent &&
            (valueSet !== "v" || (attribute.name === "slot" && node.parent?.componentTag))
        ) {
            extraRet.command = RETRIGGER_SUGGEST_COMMAND
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
        if (!node.isEmbedded) {
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
    }

    if (node.isEmbedded) {
        return ret
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
        const precedingExistingDirectives = new Set<string>()

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
        for (const attribute of node.prev?.attributes || []) {
            if (attribute.name.raw.startsWith("#")) {
                precedingExistingDirectives.add(attribute.name.raw.slice(1))
            }
        }
        if (precedingExistingDirectives.has("if") || precedingExistingDirectives.has("elif")) {
            setSortTextMap({ elif: 1, else: 2 })
        }
        if (precedingExistingDirectives.has("await")) {
            if (precedingExistingDirectives.has("then")) {
                setSortTextMap({ catch: 1 })
            } else if (!precedingExistingDirectives.has("catch")) {
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
        // 指令名补全建议会有两种 filterText，一种有 # 前缀，一种没有，这样做的好处就是无论
        // 用户有没有输入#前缀都会返回指令名补全建议，例如：#f 和 f 都可以得到 for 指令的补全建议
        htmlDirectives.forEach(item => {
            if (
                !existingDirectives.has(item.name) &&
                !unsetDirectives.includes(item.name) &&
                (item.name !== "slot" || node.parent?.componentTag)
            ) {
                let valueSnippet = "$1"
                switch (item.name) {
                    case "slot": {
                        valueSnippet = '${2:context} from "$1"'
                        break
                    }
                    case "for": {
                        valueSnippet = "${2:item}, ${3:index} of ${1:source}"
                        break
                    }
                }
                const label = "#" + item.name
                const noValue = hasValue || item.name === "else" || item.name === "html"
                const completion: CompletionItem = {
                    label: label,
                    filterText: label,
                    kind: CompletionItemKind.Keyword,
                    insertTextFormat: InsertTextFormat.Snippet,
                    sortText: "" + (sortTextMap[item.name] || "9"),
                    documentation: getDirectiveDocumentation(item, true),
                    command: item.name === "slot" ? RETRIGGER_SUGGEST_COMMAND : undefined,
                    textEdit: { range, newText: `${label}${noValue ? "" : `={${valueSnippet}}`}` }
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

// 判断标签是否具有匹配的结束标签，与解析逻辑不同的是，如果标签与父元素标签
// 一致且父标签不存在结束标签时视为当前标签不存在匹配的结束标签（向上递归查询）
function hasMatchedEndTag(node: TemplateNode) {
    if (-1 === node.loc.end.index) {
        return false
    }
    while (node.parent?.tag === node.tag) {
        if (-1 === node.parent.loc.end.index) {
            return false
        }
        node = node.parent
    }
    return true
}
