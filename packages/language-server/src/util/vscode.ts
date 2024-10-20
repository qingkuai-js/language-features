import type { Position, Range } from "vscode-languageserver"

// 将Position转换成Rnage（开始与结束位置与Position相同）
export function position2Range(position: Position): Range {
    return { start: { ...position }, end: { ...position } }
}

// create a new offset position base on an old position
export function offsetPosition(position: Position, lineDelta: number, charDelta: number) {
    const { line, character } = position
    return {
        line: line + lineDelta,
        character: character + charDelta
    } satisfies Position
}
