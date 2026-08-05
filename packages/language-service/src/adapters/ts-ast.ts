import type TS from "typescript"

import { ts } from "./state"
import { isUndefined } from "../../../../shared-util/assert"
import { constants as qingkuaiConstants } from "qingkuai/compiler"

export function findAncestorUntil(
    node: TS.Node,
    callback: (node: TS.Node) => boolean
): TS.Node | undefined {
    while (callback(node)) {
        node = node.parent
        if (!node) {
            return undefined
        }
    }
    return node
}

export function getKindName(node: TS.Node) {
    return ts.SyntaxKind[node.kind]
}

export function getSymbolAtPositionWithin(
    node: TS.Node,
    pos: number,
    typeChecker: TS.TypeChecker
): TS.Symbol | undefined {
    const foundNode = getNodeAtPositionWithin(node, pos)
    return foundNode && typeChecker.getSymbolAtLocation(foundNode)
}

// 判断某个节点是否处于当前文件的顶部作用域
export function isInTopScope(node: TS.Node): boolean {
    switch (node.parent.kind) {
        case undefined:
        case ts.SyntaxKind.SourceFile: {
            return true
        }
        case ts.SyntaxKind.Block:
        case ts.SyntaxKind.CaseBlock:
        case ts.SyntaxKind.ModuleBlock:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.ClassStaticBlockDeclaration: {
            return false
        }
        default: {
            return !ts.isParameter(node) && isInTopScope(node.parent)
        }
    }
}

// 查找指定位置的节点
export function findNodeAtPosition(
    sourceFile: TS.SourceFile,
    position: number
): TS.Node | undefined {
    const find = (node: TS.Node): TS.Node | undefined => {
        if (position >= node.getStart() && position < node.getEnd()) {
            return ts.forEachChild(node, find) || node
        }
        return undefined
    }
    return find(sourceFile)
}

export function getAliasedSymbol(typeChecker: TS.TypeChecker, node: TS.Node) {
    const symbol = typeChecker.getSymbolAtLocation(node)
    return symbol && typeChecker.getAliasedSymbol(symbol)
}

export function isComponentFuncReturns(node: TS.Node): boolean {
    return !!findAncestorUntil(node, node => {
        return (
            ts.isReturnStatement(node) &&
            node.parent &&
            ts.isArrowFunction(node.parent) &&
            node.parent.parent &&
            ts.isVariableDeclaration(node.parent.parent) &&
            ts.isIdentifier(node.parent.parent.name) &&
            node.parent.parent.name.text === qingkuaiConstants.LSC.COMPONENT
        )
    })
}

// 遍历所有后代节点
export function walkTsNode(node: TS.Node | undefined, callback: (node: TS.Node) => void) {
    if (!isUndefined(node)) {
        callback(node)
        ts.forEachChild(node, cn => {
            walkTsNode(cn, callback)
        })
    }
}

// 从指定节点中查找指定位置的节点（深度优先遍历）
export function getNodeAtPositionWithin(node: TS.Node, pos: number): TS.Node | undefined {
    const [start, len] = [node.getStart(), node.getWidth()]
    if (pos >= start && pos <= start + len) {
        for (const child of node.getChildren()) {
            const foundInChild = getNodeAtPositionWithin(child, pos)
            if (foundInChild) {
                return foundInChild
            }
        }
        return node
    }
    return undefined
}

// 判断某个节点是否处于组件函数顶部作用域
export function isInComponentFunctionTopScope(node: TS.Node): boolean {
    return !!ts.findAncestor(node, ancestor => {
        return node !== ancestor && ts.isFunctionDeclaration(ancestor) && isInTopScope(ancestor)
    })
}
