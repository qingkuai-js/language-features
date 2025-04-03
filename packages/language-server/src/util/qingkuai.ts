import type { Position } from "vscode-languageserver"
import type { FixedArray } from "../../../../types/util"
import type { CachedCompileResultItem } from "../types/service"
import type { NumNum, PrettierConfiguration } from "../../../../types/common"
import type { ASTPosition, StyleDescriptor, TemplateNode } from "qingkuai/compiler"

import { cssLanguageService } from "../state"
import { isEmptyString } from "../../../../shared-util/assert"
import { TextDocument } from "vscode-languageserver-textdocument"

// 整理自动添加的import语句的格式
export function formatImportStatement(
    statement: string,
    source: string,
    posRange: NumNum,
    prettierConfig: PrettierConfiguration
) {
    statement = " ".repeat(prettierConfig.tabWidth || 2) + statement
    if (!/^\s*\n/.test(source.slice(posRange[1]))) {
        statement += "\n"
    }
    if (!/\n\s*$/.test(source.slice(0, posRange[0]))) {
        statement = "\n" + statement
    }
    if (prettierConfig.semi) {
        statement += ";"
    }
    return statement
}

export function toLSPosition(position: ASTPosition): Position {
    return { line: position.line - 1, character: position.column }
}

// 找到源码中某个索引所处的attribute
export function findAttribute(index: number, node: TemplateNode) {
    for (let i = 0; i < node.attributes.length; i++) {
        const attribute = node.attributes[i]
        const endIndex = attribute.loc.end.index

        // 1. 不存在等号（属性名范围内，attribute.value.loc.start.index为-1）
        // 2. 存在等号但不存在引号或大括号（endIndex与attribute.value.loc.end.index相等）
        // 上面两种情况其中一个成立时，记录范围增量为1（光标在attribute.loc.end.index处也视为在当前属性范围内）
        // 这样处理是因为情况1要在输入等号时自动插入引号或大括号包裹，情况2要明确当前正在输入属性名并给出属性名补全建议
        const delta = Number(
            attribute.value.loc.start.index === -1 || endIndex === attribute.value.loc.end.index
        )

        if (index >= attribute.loc.start.index && (endIndex === -1 || index < endIndex + delta)) {
            return attribute
        }
    }
}

// 根据style block的内容创建TextDocument和StyleSheet
// 注意：此方法创建的textDocument会将style块内容开始前的行以空行填充，列以空格填充
export function createStyleSheetAndDocument(cr: CachedCompileResultItem, offset: number) {
    const styleDescriptor = cr.inputDescriptor.styles.find(item => {
        return offset >= item.loc.start.index && offset <= item.loc.end.index
    })
    if (!styleDescriptor) {
        return null
    }

    let languageId = styleDescriptor.lang
    if (!/(?:css|s[ca]ss|less)/.test(languageId)) {
        languageId = "css"
    }

    const preLine = "\n".repeat(styleDescriptor.loc.start.line - 1)
    const preColumn = " ".repeat(styleDescriptor.loc.start.column)
    const content = preLine + preColumn + styleDescriptor.code
    const document = TextDocument.create(cr.uri, languageId, 1, content)
    const styleSheet = cssLanguageService.parseStylesheet(document)
    return [document, toLSPosition(cr.inputDescriptor.positions[offset]), styleSheet] as const
}

// 找到指定offset所处的事件修饰符的名称及范围，不存在时返回undefined
// 注意：调用此方法要确保offse在一个事件属性范围内，若不在事件属性范围内并不是一定返回undefined
export function findEventModifier(source: string, offset: number, range: FixedArray<number, 2>) {
    let endIndex = offset
    let startIndex = offset - 1

    while (endIndex < range[1] && source[endIndex] !== "|") {
        endIndex++
    }
    while (startIndex > range[0] && source[startIndex] !== "|") {
        startIndex--
    }

    if (source[startIndex] !== "|") {
        return undefined
    }

    const modifierRange: FixedArray<number, 2> = [startIndex + 1, endIndex]
    return {
        range: modifierRange,
        name: source.slice(...modifierRange)
    }
}

// 找到某个TemplateNode节点标签名范围（包括开始标签和结束标签），如果offset不在开始或结束标签名范围内则返回空数组
// 默认情况下，如果位于标签名结束的后一个位置，是不算做在标签名范围内的，例如<div_>或</div_>的下划线处，若要改变这一行为，
// 请传入第二个参数为true（此处理为了是为了兼容某些特殊情况，例如重名标签名时，如果光标在标签名之后一个位置，也应正常处理）
export function findTagRanges(node: TemplateNode, offset: number, includeEndChar = false) {
    // @ts-ignore
    const ret: FixedArray<NumNum | undefined, 2> = []

    // 文本节点无标签
    if (isEmptyString(node.tag)) {
        return ret
    }

    const delta = +includeEndChar
    const tagLen = node.tag.length
    const statTagNameStartIndex = node.loc.start.index + 1
    const startTagNameEndIndex = statTagNameStartIndex + tagLen
    const endTagNameStartIndex = node.endTagStartPos.index + 2
    if (
        (offset >= statTagNameStartIndex && offset < startTagNameEndIndex + delta) ||
        (offset >= endTagNameStartIndex && offset < endTagNameStartIndex + tagLen + delta)
    ) {
        ret[0] = [statTagNameStartIndex, startTagNameEndIndex]
        if (endTagNameStartIndex !== 1) {
            ret[1] = [endTagNameStartIndex, endTagNameStartIndex + tagLen]
        }
    }

    return ret
}

// 找到源码中某个索引所处的AST节点
export function findNodeAt(nodes: TemplateNode[], offset: number): TemplateNode | undefined {
    for (const currentNode of nodes) {
        const [start, end] = currentNode.range
        if (offset >= start && (end === -1 || offset < end)) {
            if (currentNode.children.length === 0) {
                return currentNode
            }
            return findNodeAt(currentNode.children, offset) || currentNode
        }
    }
}
