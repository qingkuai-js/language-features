import type { Position, Range } from "vscode-languageserver-types"

// 将position转换为字符串，格式
export function stringifyPosition(position: Position) {
    return `${position.line}-${position.character}`
}

// 将Range转换为字符串
export function stringifyRange(range: Range) {
    return `${stringifyPosition(range.start)}-${stringifyPosition(range.end)}`
}
