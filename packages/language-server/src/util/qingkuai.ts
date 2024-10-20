import type { TemplateNode } from "qingkuai/compiler"
import type { FixedArray } from "../../../../types/util"
import { isEmptyString } from "../../../../shared-util/assert"

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

// 找到某个TemplateNode节点标签名范围（包括开始标签和结束标签），如果offset不在开始或结束标签名范围内则返回空数组
// 默认情况下，如果位于标签名结束的后一个位置，是不算做在标签名范围内的，例如<div|>或</div|>，若要改变这一行为，
// 请传入第二个参数为true（此处理为了是为了兼容某些特殊情况，例如重名标签名时，如果光标在标签名之后一个位置，也应正常处理）
export function findTagRanges(node: TemplateNode, offset: number, includeEndChar = false) {
    // @ts-ignore
    const ret: FixedArray<FixedArray<number, 2> | undefined, 2> = []

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
        (offset > endTagNameStartIndex && offset < endTagNameStartIndex + tagLen + delta)
    ) {
        ret[0] = [statTagNameStartIndex, startTagNameEndIndex]
        if (endTagNameStartIndex !== -1) {
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
