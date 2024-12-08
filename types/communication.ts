import type { SlotInfo } from "qingkuai/compiler"
import type { CompletionItem, CompletionList, Range } from "vscode-languageserver"

export interface RetransmissionParams<T = any> {
    data: T
    name: string
}

export interface InsertSnippetParam {
    text: string
    command?: string
}

export interface UpdateSnapshotParams {
    itos: number[]
    fileName: string
    interCode: string
    slotInfo: SlotInfo
    scriptKindKey: "JS" | "TS"
}

export interface TSDiagnosticRelatedInformation {
    range?: Range
    start: number
    length: number
    message: string
    filePath: string
}
export interface TSDiagnostic {
    kind: number
    code: number
    start: number
    length: number
    source: string
    message: string
    deprecated: boolean
    unnecessary: boolean
    relatedInformation: TSDiagnosticRelatedInformation[]
}

export type CompletionResult = CompletionItem[] | CompletionList | undefined | null
