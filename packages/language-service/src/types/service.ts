import type {
    HoverTipResult,
    RenameLocationItem,
    InsertSnippetParam,
    GetCompletionsResult,
    FindDefinitionResult,
    FindReferenceResultItem,
    ResolveCompletionParams,
    GetDiagnosticResultItem,
    FindDefinitionResultItem
} from "../../../../types/communication"
import type {
    NumNum,
    RealPath,
    CustomFS,
    CustomPath,
    MaybePromise,
    CompileResult,
    QingkuaiConfiguration,
    ComponentAttributeItem
} from "../../../../types/common"
import type TS from "typescript"
import type Prettier from "prettier"
import type { ProjectKind } from "../constants"
import type { HoverSettings } from "vscode-css-languageservice"
import type { ASTPositionWithFlag, SlotInfo } from "qingkuai/compiler"
import type { commonMessage as runtimeCommonMessage } from "qingkuai"
import type { commonMessage as compilerCommonMessage } from "qingkuai/compiler"
import type { CompletionItem, Position, SignatureHelp } from "vscode-languageserver-types"
import { ComponentIdentifierInfo } from "../../dist"

export type DiagnosticKind =
    | "getSemanticDiagnostics"
    | "getSyntacticDiagnostics"
    | "getSuggestionDiagnostics"

export interface CodeLensData {
    fileName: RealPath
    interIndex: number
    position: Position
    slotName?: string
    componentName?: string
    type: "reference" | "implementation"
}

export interface CodeLensConfig {
    referencesCodeLens: {
        enabled: boolean
        showOnAllFunctions: boolean
    }
    implementationsCodeLens?: {
        enabled: boolean
        showOnInterfaceMethods: boolean
    }
}

export interface TextEditWithPosRange {
    range: NumNum
    newText: string
}

export interface AdapterCompileInfo {
    itos: number[]
    content: string
    slotInfo: SlotInfo
    scriptKind: TS.ScriptKind
    positions: ASTPositionWithFlag[]
    attributeInfos: ComponentAttributeItem[]
}

export type ScriptCompletionData = {
    kind: "script"
    projectKind: ProjectKind
} & ResolveCompletionParams

export type ScriptCompletionDetail = Omit<
    TS.CompletionEntryDetails,
    "documentation" | "codeActions" | "displayParts"
> & {
    detail: string
    documentation?: string
    codeActions?: (Omit<TS.CodeAction, "changes"> & {
        effects: TS.FileTextChanges[]
        currentFileChanges: TextEditWithPosRange[]
    })[]
}

export interface CreateLsAdaptersOptions {
    ts: typeof TS
    fs: CustomFS
    path: CustomPath
    typeDeclarationFilePath: string
    getConfig: GetQingkuaiConfigFunc
    getFullFileNames: GetFullFileNamesFunc
    getUserPreferences: GetUserPreferencesFunc
    getCompileInfo: GetAdapterCompileResultFunc
    getLineAndCharacter: GetLineAndCharacterFunc
    getFormattingOptions: GetFormattingOptionsFunc
    getTsLanguageService: GetTsLanguageServiceFunc
    getInterIndexByLineAndCharacter: GetInterIndexByLineAndCharacterFunc
}

export type GetCodeLensConfigFunc = (
    uri: string,
    languageId: string
) => MaybePromise<CodeLensConfig>

export type GetLineAndCharacterFunc = (
    fileName: string,
    pos: number
) => TS.LineAndCharacter | undefined

export type GetScriptHoverFunc = (
    fileName: RealPath,
    pos: number
) => MaybePromise<HoverTipResult | null>

export type GetScriptBlockSignatureFunc = (
    fileName: RealPath,
    pos: number,
    isRetrigger: boolean,
    triggerCharacter?: string
) => MaybePromise<SignatureHelp | null>

export type GetInterIndexByLineAndCharacterFunc = (
    fileName: string,
    lineAndCharacter: TS.LineAndCharacter
) => number

export type PrepareRenameInScriptBlockFunc = (
    cr: CompileResult,
    pos: number
) => MaybePromise<NumNum | null>

export type GetScriptDiagnosticsFunc = (
    fileName: RealPath
) => MaybePromise<GetDiagnosticResultItem[]>

export type FindScriptDefinitionsFunc = (
    cr: CompileResult,
    pos: number
) => MaybePromise<FindDefinitionResult | null>

export type GetScriptCompletionsFunc = (
    fileName: RealPath,
    pos: number
) => MaybePromise<GetCompletionsResult | null>

export type RenameInScriptBlockFunc = (
    fileName: RealPath,
    pos: number
) => MaybePromise<RenameLocationItem[] | null>

export type GetScriptCompletionDetailFunc = (
    item: CompletionItem
) => MaybePromise<ScriptCompletionDetail | null>

export type FindScriptReferencesFunc = (
    fileName: RealPath,
    offset: number
) => MaybePromise<FindReferenceResultItem[] | null>

export type GetScriptImplementationsFunc = (
    fileName: RealPath,
    pos: number
) => MaybePromise<FindReferenceResultItem[] | null>

export type resolveScriptCodeLensFunc = (
    fileName: RealPath,
    pos: number,
    type: "reference" | "implementation"
) => MaybePromise<FindReferenceResultItem[] | null>

export type FindScriptTypeDefinitionsFunc = (
    fileName: RealPath,
    pos: number
) => MaybePromise<FindDefinitionResultItem[] | null>

export type GetFullFileNamesFunc = () => string[]
export type GetRealPathFunc = (fileName: string) => RealPath
export type CompletionData = ScriptCompletionData | { kind: "emmet" }
export type QingkuaiRuntimeCommonMessage = typeof runtimeCommonMessage
export type QingkuaiCompilerCommonMessage = typeof compilerCommonMessage
export type InsertSnippetFunc = (item: string | InsertSnippetParam) => void
export type GetUserPreferencesFunc = (fileName: string) => TS.UserPreferences
export type GetCompileResultFunc = (path: string) => MaybePromise<CompileResult>
export type GetFormattingOptionsFunc = (fileName: string) => TS.FormatCodeSettings
export type GetAdapterCompileResultFunc = (fileName: string) => AdapterCompileInfo
export type PrettierAndPlugins = [typeof Prettier, ...Array<string | Prettier.Plugin>]
export type GetCssConfigFunc = (uri: string) => MaybePromise<HoverSettings | undefined>
export type GetTsLanguageServiceFunc = (fileName: string) => TS.LanguageService | undefined
export type GetQingkuaiConfigFunc = (fileName: RealPath) => QingkuaiConfiguration | undefined
export type GetScriptNavTreeFunc = (fileName: RealPath) => MaybePromise<TS.NavigationTree | null>
export type GetComponentInfosFunc = (fileName: string) => MaybePromise<ComponentIdentifierInfo[]>
