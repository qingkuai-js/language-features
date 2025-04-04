import type {
    Range,
    Command,
    WorkspaceEdit,
    CompletionItemLabelDetails
} from "vscode-languageserver"
import type {
    NumNum,
    RealPath,
    NumNumArray,
    PrettierConfiguration,
    TSClientConfiguration,
    ExtensionConfiguration,
    QingkuaiConfigurationWithDir
} from "./common"
import type { SlotInfo } from "qingkuai/compiler"
import type { CompletionEntryData, ScriptElementKind, TextSpan } from "typescript"

export interface ConfigPluginParms {
    sockPath: string
    triggerFileName: string
    configurations: QingkuaiConfigurationWithDir[]
}

export interface ConnectToTsServerParams {
    sockPath: string
    isReconnect: boolean
}

export interface RefreshDiagnosticParams {
    byFileName: string
    scriptKindChanged: boolean
}

export interface RenameFileParams {
    oldPath: RealPath
    newPath: RealPath
}

export type RenameFileResult = {
    fileName: string
    changes: {
        range: Range
        newText: string
    }[]
}[]

export interface ApplyWorkspaceEditParams {
    edit: WorkspaceEdit
    message?: string
    isRefactoring?: boolean
}

export interface FindComponentTagRangeParams {
    fileName: string
    componentTag: string
}

export interface RetransmissionParams<T = any> {
    data: T
    name: string
}

export interface TPICCommonRequestParams {
    fileName: RealPath
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

export interface RenameLocationItem {
    fileName: string
    loc?: Range
    range?: NumNum
    prefix?: string
    suffix?: string
}

export interface ComponentIdentifierInfo {
    name: string
    imported: boolean
    slotNams: string[]
    relativePath: string
    attributes: ComponentAttributeItem[]
}

export interface GetClientLanguageConfigParams {
    filePath: string
    scriptPartIsTypescript: boolean
}

export interface GetClientLanguageConfigResult {
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

export interface GetSemanticTokensParams {
    fileName: string
    start: number
    length: number
}

export interface ResolveCompletionParams {
    pos: number
    fileName: RealPath
    entryName: string
    source?: string
    original?: CompletionEntryData
}

export interface FindReferenceResultItem {
    fileName: string
    range: Range
}

export interface FindDefinitionResultItem {
    fileName: string
    targetRange: Range
    targetSelectionRange: Range
}

export interface FindDefinitionResult {
    range: NumNum
    definitions: FindDefinitionResultItem[]
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

export interface InsertSnippetParam {
    text: string
    command?: string
}

export interface UpdateSnapshotParams {
    fileName: RealPath
    interCode: string
    slotInfo: SlotInfo
    scriptKindKey: "JS" | "TS"
    cp: number[] // compressed positions
    citos: NumNumArray // compressed itos
    cpf: NumNumArray // compressed position flags
}

export interface TSDiagnosticRelatedInformation {
    range?: Range
    start: number
    length: number
    message: string
    filePath: RealPath
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

export type GetCompletionResult = {
    isIncomplete: boolean
    defaultCommitCharacters: string[]
    defaultRepalcementSpan?: TextSpan
    entries: GetCompletionResultEntry[]
} | null

export type GetClientConfigParams<T = any> = {
    uri: string
    section: string
} & (
    | {
          name: string
          defaultValue?: T
      }
    | {
          includes?: string[]
      }
)

export type SignatureHelpParams = TPICCommonRequestParams & {
    isRetrigger: boolean
    triggerCharacter?: "," | "(" | "<"
}

export type FindDefinitionParams = TPICCommonRequestParams & {
    preferGoToSourceDefinition: boolean
}
