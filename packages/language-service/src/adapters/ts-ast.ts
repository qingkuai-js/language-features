import type TS from "typescript"

import { endingInvalidStrRE } from "../regular"
import { ts, typeDeclarationFilePath } from "./state"
import { isString, isUndefined } from "../../../../shared-util/assert"

export function getKindName(node: TS.Node) {
    return ts.SyntaxKind[node.kind]
}
// 获取节点文本的长度（不包含结尾的空白字符及分号）
export function getLength(nodeOrText: TS.Node | string) {
    if (!isString(nodeOrText)) {
        nodeOrText = nodeOrText.getText()
    }
    return nodeOrText.replace(endingInvalidStrRE, "").length
}

// 判断某个节点是否处于当前文件的顶部作用域
export function isInTopScope(node: TS.Node): boolean {
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

export function findAncestorUntil(node: TS.Node, kind: TS.SyntaxKind) {
    while (node.kind !== kind) {
        node = node.parent
        if (!node) {
            return undefined
        }
    }
    return node
}

// 判断节点类型是否可被视为事件
export function isEventType(type: TS.Type) {
    if (type.isClass()) {
        return false
    }
    if (type.isUnion()) {
        return type.types.some(isEventType)
    }
    return !!(type.getCallSignatures().length || type.symbol?.name === "Function")
}

// 查找响应性声明相关编译器助手函数所属的变量声明节点
export function findVariableDeclarationOfReactFunc(node: TS.Node) {
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

// 判断符号的定义处是否为qingkuai类型声明文件
export function isDeclarationOfGlobalType(symbol: TS.Symbol | undefined) {
    return (
        symbol?.declarations?.length === 1 &&
        symbol.declarations[0].getSourceFile().fileName === typeDeclarationFilePath
    )
}

// 遍历所有后代节点
export function walk(node: TS.Node | undefined, callback: (node: TS.Node) => void) {
    if (!isUndefined(node)) {
        callback(node), ts.forEachChild(node, cn => walk(cn, callback))
    }
}

// 从指定节点中查找指定位置的节点（深度优先遍历）
export function getNodeAt(node: TS.Node, pos: number): TS.Node | undefined {
    const [start, len] = [node.getStart(), node.getWidth()]
    if (pos >= start && pos <= start + len) {
        for (const child of node.getChildren()) {
            const foundInChild = getNodeAt(child, pos)
            if (foundInChild) {
                return foundInChild
            }
        }
        return node
    }
    return undefined
}

// 判断是否是内置的全局声明标识符（props、refs）
export function isBuiltInGlobalDeclaration(node: TS.Identifier, typeChecker: TS.TypeChecker) {
    const symbol = typeChecker.getSymbolAtLocation(node)
    for (const declaration of symbol?.declarations || []) {
        const variableDeclaration = findAncestorUntil(
            declaration,
            ts.SyntaxKind.VariableDeclaration
        )
        return variableDeclaration && isInTopScope(variableDeclaration)
    }
}

// 查找指定位置的节点
export function findNodeAtPosition(
    sourceFile: TS.SourceFile,
    position: number
): TS.Node | undefined {
    function find(node: TS.Node): TS.Node | undefined {
        if (position >= node.getStart() && position < node.getEnd()) {
            return ts.forEachChild(node, find) || node
        }
        return undefined
    }
    return find(sourceFile)
}

export function isSymbolKey(symbol: TS.Symbol): boolean {
    if (!symbol.declarations) {
        return false
    }
    return symbol.declarations.some(decl => {
        const name = (decl as TS.NamedDeclaration).name
        if (!name || !("expression" in name)) {
            return false
        }
        return (
            (ts.isIdentifier(name.expression) && name.expression.escapedText === "symbol") ||
            (ts.isComputedPropertyName(name) && ts.isPropertyAccessExpression(name.expression))
        )
    })
}
