import type { Position, Range } from "vscode-languageserver"

// 将position转换为字符串，格式
export function stringifyPosition(position: Position) {
    return `${position.line}-${position.character}`
}

// 将Range转换为字符串
export function stringifyRange(range: Range) {
    return `${stringifyPosition(range.start)}-${stringifyPosition(range.end)}`
}

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
