import type { SlotInfo } from "qingkuai/compiler"
import type { Options as PrettierConfiguration } from "prettier"
import type { CompletionEntryData, ScriptElementKind, TextSpan } from "typescript"
import type { ExtensionConfiguration, NumNum, TSClientConfiguration } from "./common"
import type { Range, CompletionItemLabelDetails, Command } from "vscode-languageserver"

export interface RetransmissionParams<T = any> {
    data: T
    name: string
}

export interface HoverTipParams {
    fileName: string
    pos: number
}

export interface HoverTipResult {
    content: string
    posRange: NumNum
}

export interface ComponentAttributeItem {
    kind: "Prop" | "Ref"
    name: string
    type: string
    isEvent: boolean
    stringCandidates: string[]
}

export interface ComponentIdentifierInfo {
    name: string
    imported: boolean
    slotNams: string[]
    relativePath: string
    attributes: ComponentAttributeItem[]
}

export interface GetCompletionForScriptParams {
    pos: number
    fileName: string
}

export interface GetClientConfigParams {
    filePath: string
    scriptPartIsTypescript: boolean
}

export interface GetClientConfigResult {
    workspacePath: string
    prettierConfig: PrettierConfiguration
    typescriptConfig: TSClientConfiguration
    extensionConfig: ExtensionConfiguration
}

export interface ConfigureFileParams {
    fileName: string
    workspacePath: string
    config: TSClientConfiguration
}

export interface ResolveCompletionParams {
    pos: number
    fileName: string
    entryName: string
    source?: string
    ori?: CompletionEntryData
}

export interface ResolveCompletionTextEdit {
    start: number
    end: number
    newText: string
}

export interface ResolveCompletionResult {
    detail?: string
    command?: Command
    documentation?: string
    textEdits?: ResolveCompletionTextEdit[]
}

export interface GetCompletionResultEntry {
    name: string
    label: string
    kind: ScriptElementKind
    source?: string
    detail?: string
    sortText?: string
    isColor?: boolean
    filterText?: string
    insertText?: string
    isSnippet?: boolean
    preselect?: boolean
    deprecated?: boolean
    data?: CompletionEntryData
    replacementSpan?: TextSpan
    commitCharacters?: string[]
    labelDetails?: CompletionItemLabelDetails
}

export type GetCompletionForScriptResult = null | {
    isIncomplete: boolean
    defaultCommitCharacters: string[]
    defaultRepalcementSpan?: TextSpan
    entries: GetCompletionResultEntry[]
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
