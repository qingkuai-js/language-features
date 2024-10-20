import type { CompileResult } from "qingkuai/compiler"
import type { Position, Range } from "vscode-languageserver"
import type { TextDocument } from "vscode-languageserver-textdocument"

export type CachedCompileResultItem = CompileResult & {
    source: string
    version: number
    document: TextDocument
    getOffset: (position: Position) => number
    getPosition: (offset: number) => Position
    getRange: (start: number, end?: number) => Range
}
