import type {
    GetClientConfigResult,
    ComponentIdentifierInfo
} from "../../../../types/communication"
import type { Position, Range } from "vscode-languageserver"
import type { TextDocument } from "vscode-languageserver-textdocument"
import type { CompileResult, PositionFlagKeys } from "qingkuai/compiler"

export type GetRangeFunc = (start: number, end?: number) => Range
export type GetSourceIndexFunc = (interIndex: number, isEnd?: boolean) => number

export type CachedCompileResultItem = CompileResult & {
    version: number
    filePath: string
    getRange: GetRangeFunc
    document: TextDocument
    isSynchronized: boolean
    config: GetClientConfigResult
    builtInTypeDeclarationEndIndex: number
    componentInfos: ComponentIdentifierInfo[]
    getOffset: (position: Position) => number
    getPosition: (offset: number) => Position
    getInterIndex: (sourceIndex: number) => number
    getSourceIndex: (interIndex: number, isEnd?: boolean) => number
    isPositionFlagSet: (index: number, key: PositionFlagKeys) => boolean
}
