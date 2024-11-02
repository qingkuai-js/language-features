import type { SourceFile, Node } from "typescript"

import { ts } from "./state"

export function findNodeAtPosition(sourceFile: SourceFile, position: number): Node | undefined {
    function find(node: Node): Node | undefined {
        if (position >= node.getStart() && position < node.getEnd()) {
            return ts.forEachChild(node, find) || node
        }
        return undefined
    }
    return find(sourceFile)
}
