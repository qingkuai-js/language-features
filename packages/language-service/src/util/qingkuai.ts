import type { TemplateNode } from "qingkuai/compiler"
import type { Range } from "vscode-languageserver-types"
import type { GetCompileResultFunc } from "../types/service"
import type { ProjectKind } from "../../../../shared-util/constant"
import type { Pair, PrettierConfiguration } from "../../../../types/common"

import { isEmptyString } from "../../../../shared-util/assert"

// 整理自动添加的import语句的格式
export function formatImportStatement(
    statement: string,
    source: string,
    posRange: Pair<number>,
    projectKind: ProjectKind,
    prettierConfig?: PrettierConfiguration
) {
    const tab = " ".repeat(prettierConfig?.tabWidth || 2)
    if (!posRange[0]) {
        const tagName = "lang-" + projectKind
        return `<${tagName}>\n${tab}${statement.trim()}\n</${tagName}>\n\n`
    }

    statement = " ".repeat(prettierConfig?.tabWidth || 2) + statement
    if (!/^\s*\n/.test(source.slice(posRange[1]))) {
        statement += "\n"
    }
    if (!/\n\s*$/.test(source.slice(0, posRange[0]))) {
        statement = "\n" + statement
    }
    if (prettierConfig?.semi) {
        statement += ";"
    }
    return statement
}

// 获取指定文件中指定组件开始标签的范围
export async function findComponentTagRanges(
    fileName: string,
    componentTag: string,
    getCompileRes: GetCompileResultFunc
): Promise<Range[]> {
    const ranges: Range[] = []
    const entry = await getCompileRes(fileName)
    walkTemplateNodes(entry.templateNodes, node => {
        if (node.componentTag === componentTag) {
            ranges.push(
                entry.getVscodeRange(
                    node.loc.start.index,
                    node.loc.start.index + node.tag.length + 1
                )
            )
        }
    })
    return ranges
}

// 找到源码中某个索引所处的 TemplateAttribute
export function findTemplateAttribute(index: number, node: TemplateNode) {
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

// 找到某个 TemplateNode 节点标签名范围（包括开始标签和结束标签），如果offset不在开始或结束标签名范围内则返回空对象
// 默认情况下，如果位于标签名结束的后一个位置，是不算做在标签名范围内的，例如<div_>或</div_>的下划线处，若要改变这一行为，
// 请传入第二个参数为true（此处理为了是为了兼容某些特殊情况，例如重名标签名时，如果光标在标签名之后一个位置，也应正常处理）
export function findTagNameRanges(
    node: TemplateNode,
    offset: number,
    includeClosingMarker = false
) {
    const findRes: Partial<Record<"start" | "end", Pair<number>>> = {}

    // 文本节点无标签
    if (isEmptyString(node.tag)) {
        return findRes
    }

    const delta = +includeClosingMarker
    const tagLen = node.tag.length
    const statTagNameStartIndex = node.loc.start.index + 1
    const startTagNameEndIndex = statTagNameStartIndex + tagLen
    const endTagNameStartIndex = node.endTagStartPos.index + 2
    if (
        (offset >= statTagNameStartIndex && offset < startTagNameEndIndex + delta) ||
        (offset >= endTagNameStartIndex && offset < endTagNameStartIndex + tagLen + delta)
    ) {
        findRes.start = [statTagNameStartIndex, startTagNameEndIndex]
        if (endTagNameStartIndex !== 1) {
            findRes.end = [endTagNameStartIndex, endTagNameStartIndex + tagLen]
        }
    }

    return findRes
}

// 找到指定 offset 所处的事件修饰符的名称及范围，不存在时返回 undefined
// 注意：调用此方法要确保offse在一个事件属性范围内，若不在事件属性范围内并不是一定返回 undefined
export function findEventModifier(source: string, offset: number, range: Pair<number>) {
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

    const modifierRange: Pair<number> = [startIndex + 1, endIndex]
    return {
        range: modifierRange,
        name: source.slice(...modifierRange)
    }
}

// 找到指定索引处所位于的 TextContentPart
export function findTextContentPartAt(node: TemplateNode, offset: number) {
    if (!isEmptyString(node.tag)) {
        return
    }
    for (const part of node.content) {
        if (offset >= part.loc.start.index && offset <= part.loc.end.index) {
            return part
        }
    }
}

// 递归遍历qingkuai编译结果的Template Node AST
export function walkTemplateNodes<T>(
    nodes: TemplateNode[],
    cb: (node: TemplateNode) => T | undefined
) {
    for (const node of nodes) {
        const ret = cb(node)
        if (ret) {
            return ret
        }
        node.children.length && walkTemplateNodes(node.children, cb)
    }
}

// 找到源码中某个索引所处的 TemplateNode 节点
export function findTemplateNodeAt(nodes: TemplateNode[], index: number): TemplateNode | undefined {
    for (const currentNode of nodes) {
        const endIndex = currentNode.loc.end.index
        const startIndex = currentNode.loc.start.index
        if (index >= startIndex && (endIndex === -1 || index < endIndex)) {
            if (currentNode.children.length === 0) {
                return currentNode
            }
            return findTemplateNodeAt(currentNode.children, index) || currentNode
        }
    }
}
