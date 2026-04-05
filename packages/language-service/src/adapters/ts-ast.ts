import type TS from "typescript"

import { ts } from "./state"
import { isUndefined } from "../../../../shared-util/assert"
import { constants as qingkuaiConstants } from "qingkuai/compiler"

export function getKindName(node: TS.Node) {
    return ts.SyntaxKind[node.kind]
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

// 判断某个节点是否处于组件函数顶部作用域
export function isInComponentFunctionTopScope(node: TS.Node): boolean {
    const blockNode = ts.findAncestor(node, ancestor => {
        return ts.isBlock(ancestor)
    })
    return !!(
        blockNode?.parent &&
        ts.isFunctionDeclaration(blockNode.parent) &&
        blockNode.parent.name?.text === qingkuaiConstants.LSC.COMPONENT
    )
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

// 遍历所有后代节点
export function walkTsNode(node: TS.Node | undefined, callback: (node: TS.Node) => void) {
    if (!isUndefined(node)) {
        callback(node)
        ts.forEachChild(node, cn => {
            walkTsNode(cn, callback)
        })
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

// 从指定节点中查找指定位置的节点（深度优先遍历）
export function getNodeAtPositionAndWithin(node: TS.Node, pos: number): TS.Node | undefined {
    const [start, len] = [node.getStart(), node.getWidth()]
    if (pos >= start && pos <= start + len) {
        for (const child of node.getChildren()) {
            const foundInChild = getNodeAtPositionAndWithin(child, pos)
            if (foundInChild) {
                return foundInChild
            }
        }
        return node
    }
    return undefined
}
