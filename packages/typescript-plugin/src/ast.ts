import type { SourceFile, Node, BinaryOperatorToken } from "typescript"

import { ts } from "./state"
import { isUndefined } from "../../../shared-util/assert"

// 判断某个节点是否处于当前文件的顶部作用域
export function isInTopScope(node: Node): boolean {
    while (!isUndefined(node) && !ts.isSourceFile(node)) {
        if (
            ts.isBlock(node) ||
            ts.isClassLike(node) ||
            ts.isModuleBlock(node) ||
            ts.isFunctionLike(node) ||
            ts.isNamespaceExportDeclaration(node)
        ) {
            return false
        }
        node = node.parent
    }
    return true
}

export function isEqualToken(token: BinaryOperatorToken) {
    return token.kind === ts.SyntaxKind.EqualsToken
}

// 遍历所有后代节点
export function walk(node: Node | undefined, callback: (node: Node) => void) {
    if (!isUndefined(node)) {
        callback(node), ts.forEachChild(node, cn => walk(cn, callback))
    }
}

// 判断某个标识符是否可以当做类型使用

// 查找指定位置的节点
export function findNodeAtPosition(sourceFile: SourceFile, position: number): Node | undefined {
    function find(node: Node): Node | undefined {
        if (position >= node.getStart() && position < node.getEnd()) {
            return ts.forEachChild(node, find) || node
        }
        return undefined
    }
    return find(sourceFile)
}
