import type { Node, SourceFile, Symbol } from "typescript"

import { ts, typeDeclarationFilePath } from "./state"
import { isUndefined } from "../../../shared-util/assert"

export function getKindName(node: Node) {
    return ts.SyntaxKind[node.kind]
}

// 判断某个节点是否处于当前文件的顶部作用域
export function isInTopScope(node: Node): boolean {
    while (!ts.isSourceFile(node)) {
        node = node.parent
        if (
            ts.isBlock(node) ||
            ts.isCaseBlock(node) ||
            ts.isModuleBlock(node) ||
            ts.isClassExpression(node) ||
            ts.isClassDeclaration(node) ||
            ts.isClassStaticBlockDeclaration(node)
        ) {
            return false
        }
    }
    return true
}

// 判断符号的定义处是否为全局类型声明文件
export function isDeclarationOfGlobalType(symbol: Symbol | undefined) {
    return (
        symbol?.declarations?.length === 1 &&
        symbol.declarations[0].getSourceFile().fileName === typeDeclarationFilePath
    )
}

// 查找响应性声明相关编译器助手函数所属的变量声明节点
export function findVariableDeclarationOfReactFunc(node: Node) {
    const { parent } = node
    if (
        ts.isAsExpression(parent) ||
        ts.isSatisfiesExpression(parent) ||
        ts.isTypeAssertionExpression(parent) ||
        ts.isParenthesizedExpression(parent)
    ) {
        return findVariableDeclarationOfReactFunc(parent.parent)
    }
    return ts.isVariableDeclaration(parent) ? parent : null
}

// 遍历所有后代节点
export function walk(node: Node | undefined, callback: (node: Node) => void) {
    if (!isUndefined(node)) {
        callback(node), ts.forEachChild(node, cn => walk(cn, callback))
    }
}

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
