import type { Position, Range } from "vscode-languageserver"
import type { TextDocument } from "vscode-languageserver-textdocument"
import type { CompileResult, PositionFlagKeys } from "qingkuai/compiler"

export type CachedCompileResultItem = CompileResult & {
    version: number
    filePath: string
    document: TextDocument
    getOffset: (position: Position) => number
    getPosition: (offset: number) => Position
    getSourceIndex: (interIndex: number) => number
    getInterIndex: (sourceIndex: number) => number
    getRange: (start: number, end?: number) => Range
    isPositionFlagSet: (index: number, key: PositionFlagKeys) => boolean
}
