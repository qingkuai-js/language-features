import type { CompileResult } from "qingkuai/compiler"
import type { TextDocument } from "vscode-languageserver-textdocument"
import type { Position, Range, WorkspaceEdit } from "vscode-languageserver"

export type CachedCompileResultItem = CompileResult & {
    source: string
    version: number
    document: TextDocument
    getOffset: (position: Position) => number
    getPosition: (offset: number) => Position
    getRange: (start: number, end?: number) => Range
}
