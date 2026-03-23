import type { Pair } from "../types/common"
import type { Position } from "vscode-languageserver/node"
import type { ASTPosition, ASTPositionWithFlag } from "qingkuai/compiler"

import { CompressedPositions } from "../types/communication"

export function compressNumberArray(arr: number[]) {
    const compressed: Pair<number>[] = []
    for (let i = 1, count = 1; i <= arr.length; i++) {
        if (arr[i] === arr[i - 1]) {
            count++
        } else {
            compressed.push([arr[i - 1], count])
            count = 1
        }
    }
    return compressed
}

export function recoverNumberArray(compressed: Pair<number>[]) {
    const recovered: number[] = []
    for (const [value, count] of compressed) {
        for (let i = 0; i < count; i++) {
            recovered.push(value)
        }
    }
    return recovered
}

export function compressPositions(positions: ASTPositionWithFlag[]) {
    const lineCharacters: number[] = []
    for (let i = 1, line = 1, count = 1; i <= positions.length; i++) {
        if (positions[i]?.line === line) {
            count++
        } else {
            lineCharacters.push(count)
            count = 1
            line++
        }
    }
    return {
        lineCharacters,
        flags: compressNumberArray(positions.map(item => item.flag))
    } satisfies CompressedPositions
}

export function recoverPositions(compressed: CompressedPositions) {
    const recovered: ASTPositionWithFlag[] = []
    const recoveredFlags = recoverNumberArray(compressed.flags)
    for (let i = 0; i < compressed.lineCharacters.length; i++) {
        for (let j = 0; j < compressed.lineCharacters[i]; j++) {
            const index = recoveredFlags.length
            recovered.push({
                line: i + 1,
                column: j,
                index,
                flag: recoveredFlags[index]
            })
        }
    }
    return recovered
}

export function toLSPosition(position: ASTPosition): Position {
    return { line: position.line - 1, character: position.column }
}

// 检查传入的索引（源码索引或中间代码索引）是否是无效的
export function isIndexesInvalid(...items: (number | undefined)[]) {
    return items.some(item => {
        return !item || item === -1
    })
}
