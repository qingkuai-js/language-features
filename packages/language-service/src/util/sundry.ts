import type { ASTPosition } from "qingkuai/compiler"
import type { Position, Range } from "vscode-languageserver-types"

// 将position转换为字符串，格式
export function stringifyPosition(position: Position) {
    return `${position.line}-${position.character}`
}

// 判断qingkuai template ast中的ASTPosition和langauge-server的position是否相等
export function isPositionEqual(qk: ASTPosition, ls: Position) {
    return qk.line - 1 === ls.line && qk.column === ls.character
}

// 将Range转换为字符串
export function stringifyRange(range: Range) {
    return `${stringifyPosition(range.start)}-${stringifyPosition(range.end)}`
}
