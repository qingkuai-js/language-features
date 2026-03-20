import type {
    Pair,
    QingkuaiConfiguration,
    PrettierConfiguration,
    TSClientConfiguration,
    ExtensionConfiguration,
    TsPluginQingkuaiConfig
} from "./common"
import type TS from "typescript"
import type { Range } from "vscode-languageserver/node"
import type { ProjectKind } from "../shared-util/constant"

export interface CompressedPositions {
    flags: Pair<number>[]
    lineCharacters: number[]
}

export interface ConfigPluginParms {
    sockPath: string
    triggerFileName: string
    configurations: Record<string, TsPluginQingkuaiConfig>
}

export interface ConnectToTsServerParams {
    sockPath: string
    isReconnect: boolean
    projectKind: ProjectKind
}

export interface RenameFileParams {
    oldPath: string
    newPath: string
}

export type RenameFileResult = ApplyWorkspaceEditParams

export interface FindComponentTagRangeParams {
    fileName: string
    componentTag: string
}

export interface RetransmissionParams<T = any> {
    data: T
    name: string
}

export interface TPICCommonRequestParams {
    fileName: string
    pos: number
}

export interface GetCompletionsParms {
    fileName: string
    pos: number
    triggerCharacter: string
    triggerKind: number | undefined
}

export interface HoverTipResult {
    content: string
    range: Pair<number>
}

export interface RenameLocationItem {
    fileName: string
    prefix?: string
    suffix?: string
    loc?: Range // 非 qk 文件返回
    range?: Pair<number> // qk 文件返回
}

export interface UpdateContentParams {
    isTS: boolean
    content: string
    fileName: string
    itos: Pair<number>[]
    stoi: Pair<number>[]
    getTypeDelayIndexes: number[]
    positions: CompressedPositions
    identifierStatusInfo: Record<string, string>
    exportValueSourceRange: Pair<number> | undefined
}

export interface UpdateContentResult {
    aitos: Pair<number>[]
    astoi: Pair<number>[]
}

export interface GetClientLanguageConfigParams {
    filePath: string
    scriptLanguageId: ScriptLanguageId
}

export interface GetClientLanguageConfigResult {
    dirPath: string
    prettierConfig: PrettierConfiguration
    qingkuaiConfig: QingkuaiConfiguration
    typescriptConfig: TSClientConfiguration
    extensionConfig: ExtensionConfiguration
}

export interface ResolveCompletionParams {
    pos: number
    entryName: string
    fileName: string
    source?: string
    original?: TS.CompletionEntryData
}

export interface FindReferenceResultItem {
    fileName: string
    range: Range
}

export interface FindDefinitionsResultItem {
    fileName: string
    targetRange: Range
    targetSelectionRange: Range
}

export interface FindDefinitionsResult {
    range: Range
    definitions: FindDefinitionsResultItem[]
}

export interface InsertSnippetParams {
    text: string
    command?: string
}

export interface TSDiagnosticRelatedInformation {
    range: Range
    message: string
    filePath: string
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

export interface ConfigureFileParams extends GetClientLanguageConfigResult {
    fileName: string
}

export type ApplyWorkspaceEditParams = {
    fileName: string
    changes: {
        range: Range
        newText: string
    }[]
}[]

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

export type ScriptLanguageId = "javascript" | "typescript"

export type SignatureHelpParams = TPICCommonRequestParams & {
    isRetrigger: boolean
    triggerCharacter?: "," | "(" | "<"
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
