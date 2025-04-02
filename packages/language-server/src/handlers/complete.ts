import type {
    InsertSnippetParam,
    GetCompletionResult,
    ComponentAttributeItem,
    ResolveCompletionResult,
    ComponentIdentifierInfo,
    TPICCommonRequestParams,
    ResolveCompletionParams
} from "../../../../types/communication"
import type { TemplateNode } from "qingkuai/compiler"
import type { NumNum } from "../../../../types/common"
import type { HTMLElementDataAttributeItem } from "../types/data"
import type { TextDocument } from "vscode-languageserver-textdocument"
import type { CompletionHandler, ResolveCompletionHandler } from "../types/handlers"
import type { Position, Range, CompletionItem, Command } from "vscode-languageserver/node"
import type { CachedCompileResultItem, CompletionData, GetRangeFunc } from "../types/service"

import {
    tpic,
    documents,
    connection,
    projectKind,
    isTestingEnv,
    limitedScriptLanguageFeatures
} from "../state"
import {
    slotTagData,
    findTagData,
    htmlElements,
    findValueSet,
    htmlDirectives,
    embeddedLangTags,
    getDocumentation,
    findTagAttributeData,
    getDirectiveDocumentation
} from "../data/element"
import {
    identifierRE,
    emmetTagNameRE,
    inEntityCharacterRE,
    completeEntityCharacterRE
} from "../regular"
import {
    LSHandler,
    TPICHandler,
    DEFAULT_RANGE,
    INTER_NAMESPACE
} from "../../../../shared-util/constant"
import {
    TextEdit,
    InsertTextFormat,
    CompletionItemTag,
    CompletionItemKind
} from "vscode-languageserver/node"
import {
    COMMANDS,
    KEY_RELATED_EVENT_MODIFIERS,
    INVALID_COMPLETION_TEXT_LABELS,
    MAYBE_INVALID_COMPLETION_LABELS
} from "../constants"
import { URI } from "vscode-uri"
import { getCompileRes } from "../compile"
import { position2Range } from "../util/vscode"
import { findEventModifier } from "../util/search"
import { eventModifiers } from "../data/event-modifier"
import { parseTemplate, util } from "qingkuai/compiler"
import { mdCodeBlockGen } from "../../../../shared-util/docs"
import { htmlEntities, htmlEntitiesKeys } from "../data/entity"
import { isIndexesInvalid } from "../../../../shared-util/qingkuai"
import { doComplete as _doEmmetComplete } from "@vscode/emmet-helper"
import { findAttribute, findNodeAt, formatImportStatement } from "../util/qingkuai"
import { isEmptyString, isNull, isString, isUndefined } from "../../../../shared-util/assert"

const optionalSameKeys = [
    "preselect",
    "filterText",
    "insertText",
    "labelDetails",
    "commitCharacters"
] as const

export const complete: CompletionHandler = async ({ position, textDocument, context }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return
    }

    const cr = await getCompileRes(document)
    const { templateNodes, getOffset, getRange, getPosition } = cr

    const offset = getOffset(position)
    const source = cr.inputDescriptor.source
    const triggerChar = context?.triggerCharacter || ""
    const currentNode = findNodeAt(templateNodes, offset - 1)
    const inScript = cr.isPositionFlagSet(offset, "inScript")

    // 输入结束标签的关闭字符>时不处于任何节点，直接返回
    if (isUndefined(currentNode)) {
        return null
    }

    // 获取脚本块（包括插值表达式）的补全建议
    if (!isTestingEnv && inScript) {
        if (/[^\.\-@#<'"`:,_ ]/.test(triggerChar)) {
            return null
        }
        if (
            triggerChar === " " &&
            document.getText(cr.getRange(offset - 7, offset)) !== "import "
        ) {
        }
        return doScriptBlockComplete(cr, currentNode, offset)
    }

    // 文本节点范围内启用emmet、实体字符及自定义标签补全建议支持
    // 如果父节点结束标签未闭合且前两个字符为</，则自动闭合结束标签
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
            ...doCustomTagComplete(cr, offset, currentNode, cr.componentInfos)
        ]

        // 如果是由<触发的补全建议获取，则列举所有标签名建议
        if (source[offset - 1] === "<") {
            completions.push(
                ...doTagComplete(
                    position2Range(position),
                    cr,
                    offset,
                    currentNode,
                    cr.componentInfos
                )
            )
        }

        return completions.concat(doEmmetComplete(document, position)?.items ?? [])
    }

    // 下面的补全建议只能由这些自定义字符触发：!、@、#、&、>、=、|、-
    if (/[^!@#&>=\|\-\/]/.test(triggerChar)) {
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
            cr.componentInfos
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
    if (offset > tagNameEndIndex && (offset < startTagEndIndex || startTagEndIndex === -1)) {
        const attr = findAttribute(offset, currentNode)
        const attrKey = attr?.key.raw || ""
        const keyFirstChar = attrKey[0] || ""
        const isInterpolation = /[!@#&]/.test(keyFirstChar)
        const keyEndIndex = attr?.key.loc.end.index || offset
        const valueEndIndex = attr?.value.loc.end.index ?? -1
        const keyStartIndex = attr?.key.loc.start.index || offset
        const valueStartIndex = attr?.value.loc.start.index ?? Infinity

        // 当前节点若是组件，则找到它的属性信息
        const componentAttributes = cr.componentInfos.find(info => {
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
                    snippetItem.command = COMMANDS.TriggerSuggest
                }
            }
            return insertSnippet(snippetItem), null
        }

        // 如果光标在属性值处，返回属性值的补全建议列表
        // 如果当前不处于任何属性范围内或者处于属性名范围内，则返回属性名补全建议列表
        if (attr && offset >= valueStartIndex && offset <= valueEndIndex) {
            if (!isInterpolation) {
                // 如果是在HTML属性内输入实体字符，则返回实体字符建议
                const characterEntityCompletions = doCharacterEntityComplete(
                    getRange,
                    source,
                    offset
                )
                if (characterEntityCompletions.length > 0) {
                    return characterEntityCompletions
                }

                const valueRange = getRange(valueStartIndex, valueEndIndex)
                if (attrKey === "slot" && currentNode.parent?.componentTag) {
                    const componentInfo = cr.componentInfos.find(info => {
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
                            kind: CompletionItemKind.Constant,
                            textEdit: TextEdit.replace(valueRange, name)
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
                            textEdit: TextEdit.replace(valueRange, candidate)
                        }
                    })
                }

                // 返回普通标签属性值建议
                return doAttributeValueComplete(currentNode.tag, attrKey, valueRange)
            }
        } else if (isUndefined(attr) || offset <= keyEndIndex) {
            const keyRange = getRange(keyStartIndex, keyEndIndex)
            const normalQuote = cr.config.prettierConfig.singleQuote ? "'" : '"'
            const { componentAttributeFormatPreference } = cr.config.prettierConfig
            const useKebab = attrKey.includes("-") || componentAttributeFormatPreference === "kebab"

            // 返回引用属性补全建议
            if (keyFirstChar === "&") {
                if (!isTestingEnv && currentNode.componentTag) {
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
    }
}

export const resolveCompletion: ResolveCompletionHandler = async (item, token) => {
    if (
        !isString(item.data?.kind) ||
        limitedScriptLanguageFeatures ||
        token.isCancellationRequested
    ) {
        return item
    }

    const data: CompletionData = item.data
    switch (data.kind) {
        case "emmet": {
            const textEdit = item.textEdit!
            const newTextArr = textEdit.newText.split("")
            parseTemplate(textEdit.newText).forEach(node => {
                let sizesitCount = 0
                node.attributes.forEach(attr => {
                    if (attr.quote && !attr.value.raw) {
                        sizesitCount++
                    }
                })
                node.attributes.forEach(attr => {
                    if (attr.quote !== "none" && /[!@#&]/.test(attr.key.raw[0])) {
                        newTextArr[attr.value.loc.end.index] = "}"
                        newTextArr[attr.value.loc.start.index - 1] = "{"
                    }
                })
            })
            textEdit.newText = newTextArr.join("")
            item.documentation = item.textEdit?.newText.replace(/\$\{\d+\}/g, "|")
            break
        }

        case "script": {
            const document = documents.get(URI.file(data.fileName).toString())!
            const { getSourceIndex, getRange, inputDescriptor, config } =
                await getCompileRes(document)
            const res: ResolveCompletionResult = await tpic.sendRequest<ResolveCompletionParams>(
                TPICHandler.ResolveCompletionItem,
                data
            )
            if (res.detail) {
                item.detail = res.detail
            }
            if (res.documentation) {
                item.documentation = {
                    kind: "markdown",
                    value: res.documentation
                }
            }
            if (res.textEdits) {
                const additionalTextEdits: TextEdit[] = []
                for (const item of res.textEdits) {
                    let sourcePosRange: NumNum = [
                        getSourceIndex(item.start),
                        getSourceIndex(item.end, true)
                    ]
                    if (item.newText.trimStart().startsWith("import")) {
                        sourcePosRange = Array(2).fill(
                            inputDescriptor.script.loc.start.index
                        ) as NumNum
                        item.newText = formatImportStatement(
                            item.newText.trim(),
                            inputDescriptor.source,
                            sourcePosRange,
                            config.prettierConfig
                        )
                    }
                    if (!isIndexesInvalid(...sourcePosRange)) {
                        additionalTextEdits.push({
                            newText: item.newText,
                            range: getRange(...sourcePosRange)
                        })
                    }
                }
                if (additionalTextEdits.length) {
                    item.additionalTextEdits = additionalTextEdits
                }
            }
        }
    }
    return item
}

// 在客户端活跃文档中插入代码片段
function insertSnippet(snippet: string | InsertSnippetParam) {
    connection.sendNotification(
        LSHandler.InsertSnippet,
        isString(snippet) ? { text: snippet } : snippet
    )
}

// HTML标签补全建议
function doTagComplete(range: Range, ...restArgs: Parameters<typeof doCustomTagComplete>) {
    const ret = htmlElements.tags.map(item => {
        return {
            label: item.name,
            documentation: getDocumentation(item),
            textEdit: TextEdit.replace(range, item.name)
        } as CompletionItem
    })
    return ret.concat(doCustomTagComplete(...restArgs))
}

// 自定义HTML标签补全建议（模拟emmet行为）
function doCustomTagComplete(
    cr: CachedCompileResultItem,
    offset: number,
    node: TemplateNode,
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
            cr.config.prettierConfig.componentTagFormatPreference === "kebab"
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
                    documentation: {
                        kind: "markdown",
                        value:
                            (isString(description) ? description : description.value) +
                            (startWithLT ? "" : "\n\n" + mdCodeBlockGen("qke", `<${name}>\n\t|\n</${name}>`))
                    },
                    textEdit: TextEdit.replace(range, (startWithLT ? "" : "<") + name + (startWithLT ? "" : `>\n\t$0\n</${name}>`))
                })
            })
        }

        // 为slot标签添加emmet支持
        if (!isTestingEnv && !startWithLT) {
            ret.push({
                label: slotTagData.name,
                documentation: getDocumentation(slotTagData),
                insertTextFormat: InsertTextFormat.Snippet,
                textEdit: TextEdit.replace(range, `<slot name="$1">$0</slot>`)
            })
        }

        componentInfos.forEach(item => {
            let additionalTextEdits: TextEdit[] | undefined = undefined
            if (!item.imported) {
                const scriptStartIndex = cr.inputDescriptor.script.loc.start.index
                if (scriptStartIndex !== -1) {
                    additionalTextEdits = [
                        {
                            range: cr.getRange(scriptStartIndex),
                            newText: formatImportStatement(
                                `import ${item.name} from ${JSON.stringify(item.relativePath)}`,
                                source,
                                [scriptStartIndex, scriptStartIndex],
                                cr.config.prettierConfig
                            )
                        }
                    ]
                } else {
                    const tagName = "lang-" + projectKind
                    const tab = " ".repeat(cr.config.prettierConfig.tabWidth || 2)
                    additionalTextEdits = [
                        {
                            range: DEFAULT_RANGE,
                            newText: `<${tagName}>\n${tab}import ${item.name} from ${JSON.stringify(item.relativePath)}\n</${tagName}>\n\n`
                        }
                    ]
                }
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
                textEdit: TextEdit.replace(range, (startWithLT ? "" : "<") + tag + (startWithLT ? "" : item.slotNams.length ? `>$0</${tag}>` : ` $0 />`)),
            })
        })
    }

    return ret
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
                    textEdit: TextEdit.replace(
                        // 如果替换开始位置处存在实体字符则将替换范围修改为此实体字符的位置范围
                        getRange(entityStartIndex, offset + (matched?.[0].length || 0)),
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
        switch (key.raw[0]) {
            case "@":
                existingEvents.add(key.raw.slice(1))
                break
            case "#":
                existingDirectives.add(key.raw.slice(1))
                break
            default:
                existingAttributes.add(key.raw.slice(+/^[!&]/.test(key.raw)))
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
                command: COMMANDS.TriggerSuggest
            }
        }
        return {
            ...extraRet,
            kind: CompletionItemKind.Property,
            textEdit: TextEdit.replace(range, attribute.name + assignText)
        }
    }

    if (startChar !== "#") {
        const isDuplicate = (name: string) => {
            if (!isEvent) {
                return existingAttributes.has(name)
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
                const noValue = hasValue || item.name === "else"
                const completion: CompletionItem = {
                    label: label,
                    filterText: label,
                    kind: CompletionItemKind.Keyword,
                    insertTextFormat: InsertTextFormat.Snippet,
                    sortText: "" + (sortTextMap[item.name] || "9"),
                    documentation: getDirectiveDocumentation(item, true),
                    textEdit: TextEdit.replace(range, `${label}${noValue ? "" : "={$0}"}`)
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

async function doScriptBlockComplete(
    cr: CachedCompileResultItem,
    currentNode: TemplateNode,
    offset: number
) {
    if (limitedScriptLanguageFeatures) {
        return null
    }

    const { getRange, getSourceIndex } = cr
    const unsetTriggerCharacters = new Set<string>()
    const positionOfInterCode = cr.getInterIndex(offset)
    const attribute = findAttribute(offset, currentNode)
    const tsCompletionRes: GetCompletionResult = await tpic.sendRequest<TPICCommonRequestParams>(
        TPICHandler.GetCompletion,
        {
            fileName: cr.filePath,
            pos: positionOfInterCode
        }
    )

    if (attribute?.key.raw === "#for") {
        const m = attribute.value.loc.start.index + util.findOutOfComment(attribute.value.raw, /\S/)
        if (
            m !== -1 &&
            m <= offset &&
            identifierRE.test(cr.inputDescriptor.source.slice(m, offset))
        ) {
            unsetTriggerCharacters.add(",")
        }
    }

    if (isNull(tsCompletionRes)) {
        return null
    }

    let completionItems: CompletionItem[] = tsCompletionRes.entries.map(item => {
        const data: CompletionData = {
            kind: "script",
            original: item.data,
            source: item.source,
            entryName: item.name,
            fileName: cr.filePath,
            pos: positionOfInterCode
        }
        const ret: CompletionItem = {
            data,
            label: item.label,
            sortText: item.sortText,
            kind: convertTsCompletionKind(item.kind)
        }
        optionalSameKeys.forEach(key => {
            // @ts-expect-error
            item[key] && (ret[key] = item[key])
        })

        if (item.source) {
            ret.labelDetails = {
                description: item.source
            }
        }
        if (item.isColor) {
            ret.kind = CompletionItemKind.Color
        }
        if (item.deprecated) {
            ret.tags = [CompletionItemTag.Deprecated]
        }
        if (item.isSnippet) {
            ret.insertTextFormat = InsertTextFormat.Snippet
        }
        if (item.replacementSpan) {
            const { start, length } = item.replacementSpan
            ret.textEdit = TextEdit.del(
                getRange(getSourceIndex(start), getSourceIndex(start + length, true))
            )
        }

        return ret
    })

    // 过滤无效的补全建议
    completionItems = completionItems.filter(item => {
        if (item.label === INTER_NAMESPACE) {
            return false
        }
        if (
            item.kind === CompletionItemKind.Text &&
            INVALID_COMPLETION_TEXT_LABELS.has(item.label)
        ) {
            return false
        }
        if (!MAYBE_INVALID_COMPLETION_LABELS.has(item.label)) {
            return true
        }

        const preContent = cr.code.slice(0, cr.getInterIndex(offset))
        return !new RegExp(`${INTER_NAMESPACE}\\.\\s*`).test(preContent)
    })

    let defaultEditRange: Range | undefined = undefined
    if (tsCompletionRes.defaultRepalcementSpan) {
        const { start, length } = tsCompletionRes.defaultRepalcementSpan
        defaultEditRange = getRange(getSourceIndex(start), getSourceIndex(start + length, true))
    }

    return {
        items: completionItems,
        isIncomplete: tsCompletionRes.isIncomplete,
        itemDefaults: {
            editRange: defaultEditRange,
            commitCharacters: tsCompletionRes.defaultCommitCharacters.filter(char => {
                return !unsetTriggerCharacters.has(char)
            })
        }
    }
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

    const existing = new Set(
        node.attributes.map(item => {
            return util.kebab2Camel(item.key.raw.replace(/^[!@#&]/, ""))
        })
    )
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
            } else if (attr.type !== "boolean") {
                suffix = `=${normalQuote}$0${normalQuote}`
            }

            let command: Command | undefined = undefined
            if (attr.stringCandidates.length) {
                command = {
                    title: "suggest",
                    command: COMMANDS.TriggerSuggest
                }
            }

            completions.push({
                command,
                label: prefix + label,
                insertTextFormat: InsertTextFormat.Snippet,
                detail: `(property) ${attr.name}: ${attr.type}`,
                textEdit: TextEdit.replace(range, prefix + label + suffix),
                kind: attr.isEvent ? CompletionItemKind.Event : CompletionItemKind.Property
            })
        }
    })
    return completions
}

// 将ts补全建议的kind转换为LSP需要的kind
function convertTsCompletionKind(kind: string) {
    switch (kind) {
        case "keyword":
        case "primitive type":
            return CompletionItemKind.Keyword

        case "var":
        case "let":
        case "const":
        case "alias":
        case "local var":
        case "parameter":
            return CompletionItemKind.Variable

        case "getter":
        case "setter":
        case "property":
            return CompletionItemKind.Field

        case "function":
        case "local function":
            return CompletionItemKind.Function

        case "call":
        case "index":
        case "method":
        case "construct":
            return CompletionItemKind.Method

        case "enum":
            return CompletionItemKind.Enum

        case "enum member":
            return CompletionItemKind.EnumMember

        case "module":
        case "external module name":
            return CompletionItemKind.Module

        case "color":
            return CompletionItemKind.Color

        case "type":
        case "class":
            return CompletionItemKind.Class

        case "interface":
            return CompletionItemKind.Interface

        case "warning":
            return CompletionItemKind.Text

        case "script":
            return CompletionItemKind.File

        case "directory":
            return CompletionItemKind.Folder

        case "string":
            return CompletionItemKind.Constant

        default:
            return CompletionItemKind.Property
    }
}
