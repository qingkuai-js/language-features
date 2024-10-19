import type { Position, Range } from "vscode-languageserver"
import type { TextDocument } from "vscode-languageserver-textdocument"

// create a new offset position base on an old position
export function offsetPosition(position: Position, lineDelta: number, charDelta: number) {
    const { line, character } = position
    return {
        line: line + lineDelta,
        character: character + charDelta
    } satisfies Position
}

// 通过偏移量换取位置信息
export function getPosByOffset(document: TextDocument, offset: number) {
    return document.positionAt(offset)
}

// 通过开始和结束的索引换取范围位置信息
export function getRangeByOffset(document: TextDocument, start: number, end?: number): Range {
    return {
        start: getPosByOffset(document, start),
        end: getPosByOffset(document, end ?? start)
    }
}
