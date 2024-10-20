import type { TemplateNode } from "qingkuai/compiler"

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

        if (index > attribute.loc.start.index && (endIndex === -1 || index < endIndex + delta)) {
            return attribute
        }
    }
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
