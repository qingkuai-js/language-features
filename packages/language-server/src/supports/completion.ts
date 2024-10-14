import type {
    HTMLDataTagItem,
    HTMLDataDescription,
    HTMLDataGlobalAttributeItem,
    HTMLDataAttributeItem,
    HTMLDataValueSetValueItem
} from "../types/data"
import { type TemplateNode } from "qingkuai/compiler"
import type { CompletionHandler } from "../types/handlers"

import {
    findGlobalAttribute,
    findTag,
    findTagAttribute,
    findValueSet,
    htmlData
} from "../data/html"
import { documents, getCompileRes } from "../state"
import { CompletionItem, CompletionItemKind, InsertTextFormat } from "vscode-languageserver"
import { doComplete as doEmmetComplete } from "@vscode/emmet-helper"
import { isEmptyString, isString, isUndefined } from "../../../../shared-util/assert"
import { print } from "../../../../shared-util/sundry"

let lastVersion = 0

export const completion: CompletionHandler = async ({ position, textDocument }) => {
    const document = documents.get(textDocument.uri)
    if (!document) return

    const version = document?.version || 0
    if (lastVersion === version) return
    lastVersion = version

    const compileRes = getCompileRes(document)
    if (isUndefined(compileRes)) return

    // 此处以上的代码均为无需返回补全建议的情况

    const index = document.offsetAt(position)
    const node = findNodeAt(index, compileRes.templateNodes)
    if (isUndefined(node) || isEmptyString(node.tag)) {
        return doEmmetComplete(document, position, "html", {})
    }

    if (compileRes.source[index - node.tag.length - 1] === "<") {
        return doTagComplete()
    }

    if (compileRes.source[index - 1] === ">") {
        return
    }

    if (node.startTagEndPos.index === -1 || index <= node.startTagEndPos.index) {
        for (const { key, value } of node.attributes) {
            if (index >= value.loc.start.index && index <= value.loc.end.index) {
                return doAttributeValueComplete(node.tag, key.raw)
            }
        }
        return doAttributeComplete(node.tag)
    }

    // const htmlDocument = htmlLanguageService.parseHTMLDocument(document)
    // const htmlNode = htmlDocument.findNodeAt(offset)
    // if (inEmbeddedLang(htmlNode)) {
    //     return
    // }

    // const notInTag = isUndefined(htmlNode.tag)
    // const htmlNodeStartTagEnd = htmlNode.startTagEnd ?? Infinity
    // const htmlNodeEndTagStart = htmlNode.endTagStart ?? Infinity

    // // emmet support
    // if (notInTag || (offset > htmlNodeStartTagEnd && offset <= htmlNodeEndTagStart)) {
    //     const pre4Chars = document.getText({
    //         start: offsetPosition(position, 0, -4),
    //         end: position
    //     })
    //     if (pre4Chars !== "<!--") {
    //         return doEmmetComplete(document, position, "html", {})
    //     }
    //     connection.sendNotification("html/automaticallyCloseTag", "$0-->")
    // }

    // // attribute support
    // if (!notInTag) {
    //     if (offset > htmlNode.start && offset < htmlNodeStartTagEnd) {
    //         return htmlLanguageService.doComplete(document, position, htmlDocument)
    //     } else if (offset === htmlNodeStartTagEnd && htmlNodeEndTagStart === Infinity) {
    //         connection.sendNotification(
    //             "html/automaticallyCloseTag",
    //             htmlLanguageService.doTagComplete(document, position, htmlDocument)
    //         )
    //     }
    // }
}

// 找到源码中某个索引所处的AST节点
function findNodeAt(index: number, nodes: TemplateNode[]) {
    for (const node of nodes) {
        const [start, end] = node.range
        if (index > start && (end === -1 || index < end)) {
            if (node.children.length === 0) {
                return node
            }
            return findNodeAt(index, node.children)
        }
    }
}

// HTML标签补全建议
function doTagComplete(): CompletionItem[] {
    return htmlData.tags.map(item => {
        return {
            label: item.name,
            documentation: getDocumentation(item)
        }
    })
}

// HTML属性补全建议
function doAttributeComplete(tag: string) {
    const ret: CompletionItem[] = []
    const getExtra = (attribute: HTMLDataAttributeItem) => {
        const extraRet: Partial<CompletionItem> = {}
        if (attribute.valueSet !== "v") {
            extraRet.command = {
                title: "suggest",
                command: "editor.action.triggerSuggest"
            }
            extraRet.insertText = attribute.name + `="$0"`
            extraRet.insertTextFormat = InsertTextFormat.Snippet
        }
        return extraRet
    }
    findTag(tag)?.attributes.forEach(attribute => {
        ret.push({
            ...getExtra(attribute),
            label: attribute.name,
            documentation: attribute.description
        })
    })
    htmlData.globalAttributes.forEach(attribute => {
        ret.push({
            ...getExtra(attribute),
            label: attribute.name,
            documentation: getDocumentation(attribute)
        })
    })
    return ret
}

// HTML属性值补全建议
function doAttributeValueComplete(tag: string, attrName: string) {
    const getRes = (value: HTMLDataValueSetValueItem) => {
        return {
            label: value.name,
            kind: CompletionItemKind.Value,
            documentation: getDocumentation(value)
        } as CompletionItem
    }

    const tagAttr = findTagAttribute(tag, attrName)
    if (tagAttr && tagAttr.valueSet && tagAttr.valueSet !== "v") {
        const values = findValueSet(tagAttr.valueSet)?.values
        if (!isUndefined(values)) {
            return values.map(getRes)
        }
    }

    const globalAttr = findGlobalAttribute(attrName)
    if (globalAttr && globalAttr.valueSet && globalAttr.valueSet !== "v") {
        return findValueSet(globalAttr.valueSet)?.values.map(getRes)
    }
}

// 将htmlData.tags中的description和references组合成补全建议的documentation
function getDocumentation(
    item: HTMLDataTagItem | HTMLDataGlobalAttributeItem
): HTMLDataDescription {
    if (item.references) {
        const descriptionValue = isString(item.description)
            ? item.description
            : item.description?.value || ""
        const referenceStrArr = item.references.map(reference => {
            return `[${reference.name}](${reference.url})`
        })
        const referenceStr = referenceStrArr.join(" | ")
        return {
            kind: "markdown",
            value: descriptionValue + "\n\n" + referenceStr
        }
    }
    return item.description || ""
}
