import type {
    NumNum,
    RealPath,
    NumNumArray,
    ComponentAttributeItem,
    PrettierConfiguration,
    TSClientConfiguration,
    ExtensionConfiguration,
    QingkuaiConfigurationWithDir
} from "./common"
import type TS from "typescript"
import type { SlotInfo } from "qingkuai/compiler"
import type { Range, WorkspaceEdit } from "vscode-languageserver/node"

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
    fileName: RealPath
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

export interface RenameLocationItem {
    fileName: string
    loc?: Range
    range?: NumNum
    prefix?: string
    suffix?: string
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
    entryName: string
    fileName: RealPath
    source?: string
    original?: TS.CompletionEntryData
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
    range: Range
    definitions: FindDefinitionResultItem[]
}

export interface InsertSnippetParam {
    text: string
    command?: string
}

export interface UpdateSnapshotParams {
    fileName: RealPath
    version: number
    interCode: string
    slotInfo: SlotInfo
    scriptKindKey: "JS" | "TS"
    typeDeclarationLen: number
    cp: number[] // compressed positions
    citos: NumNumArray // compressed itos
    cpf: NumNumArray // compressed position flags
}

export interface TSDiagnosticRelatedInformation {
    range: Range
    message: string
    filePath: RealPath
}
export interface GetDiagnosticResultItem {
    kind: number
    code: number
    range: Range
    source: string
    message: string
    deprecated: boolean
    unnecessary: boolean
    relatedInformations: TSDiagnosticRelatedInformation[]
}

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

export type GetCompletionsResultEntry = TS.CompletionEntry & {
    label: string
    isColor: boolean
    isDeprecated: boolean
    detail: string | undefined
}

export type GetCompletionsResult = Omit<TS.CompletionInfo, "entries"> & {
    entries: GetCompletionsResultEntry[]
}
