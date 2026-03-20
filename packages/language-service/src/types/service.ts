import type TS from "typescript"
import type Prettier from "prettier"

import type {
    HoverTipResult,
    SignatureHelpParams,
    RenameLocationItem,
    InsertSnippetParams,
    GetCompletionsResult,
    FindDefinitionsResult,
    FindReferenceResultItem,
    ResolveCompletionParams,
    GetDiagnosticResultItem,
    FindDefinitionsResultItem
} from "../../../../types/communication"
import type {
    Pair,
    MaybePromise,
    CompileResult,
    ComponentInfo,
    TsPluginQingkuaiConfig
} from "../../../../types/common"
import type { ProjectKind } from "../enums"
import type { HoverSettings } from "vscode-css-languageservice"
import type { CompletionTriggerKind } from "vscode-languageserver"
import type { CompletionItem, Position, SignatureHelp } from "vscode-languageserver-types"

export type TsGetDiagsMethod =
    | "getSemanticDiagnostics"
    | "getSyntacticDiagnostics"
    | "getSuggestionDiagnostics"

export interface CodeLensData {
    fileName: string
    interIndex: number
    position: Position
    type: CodeLensKind
}

export interface CodeLensConfig {
    referencesCodeLens?: {
        enabled: boolean
        showOnAllFunctions: boolean
    }
    implementationsCodeLens?: {
        enabled: boolean
        showOnInterfaceMethods: boolean
    }
}

export interface TextEditWithPosRange {
    range: Pair<number>
    newText: string
}

export type CompletionData = ResolveCompletionParams & {
    kind: "script"
    projectKind: ProjectKind
}

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

export type GetCodeLensConfigFunc = (
    uri: string,
    languageId: string
) => MaybePromise<CodeLensConfig>

export type GetScriptHoverFunc = (
    fileName: string,
    pos: number
) => MaybePromise<HoverTipResult | null>

export type GetScriptBlockSignatureFunc = (
    fileName: string,
    pos: number,
    isRetrigger: boolean,
    triggerCharacter: SignatureHelpParams["triggerCharacter"]
) => MaybePromise<SignatureHelp | null>

export type PrepareRenameInScriptBlockFunc = (
    cr: CompileResult,
    pos: number
) => MaybePromise<Pair<number> | null>

export type FindScriptDefinitionsFunc = (
    cr: CompileResult,
    pos: number
) => MaybePromise<FindDefinitionsResult | null>

export type GetScriptCompletionsFunc = (
    fileName: string,
    pos: number,
    triggerCharacter: string,
    triggerKind: CompletionTriggerKind | undefined
) => MaybePromise<GetCompletionsResult | null>

export type RenameInScriptBlockFunc = (
    fileName: string,
    pos: number
) => MaybePromise<RenameLocationItem[] | null>

export type GetScriptCompletionDetailFunc = (
    item: CompletionItem
) => MaybePromise<ScriptCompletionDetail | null>

export type FindScriptReferencesFunc = (
    fileName: string,
    offset: number
) => MaybePromise<FindReferenceResultItem[] | null>

export type GetScriptImplementationsFunc = (
    fileName: string,
    pos: number
) => MaybePromise<FindReferenceResultItem[] | null>

export type DoResolveCodeLensFunc = (
    fileName: string,
    pos: number,
    type: "reference" | "implementation"
) => MaybePromise<FindReferenceResultItem[] | null>

export type FindScriptTypeDefinitionsFunc = (
    fileName: string,
    pos: number
) => MaybePromise<FindDefinitionsResultItem[] | null>

export type CodeLensKind = "implementation" | "reference" | "assignment"

export type PrettierAndPlugins = [typeof Prettier, ...Array<string | Prettier.Plugin>]

export type InsertSnippetFunc = (item: string | InsertSnippetParams) => void
export type GetUserPreferencesFunc = (fileName: string) => TS.UserPreferences
export type GetCompileResultFunc = (path: string) => MaybePromise<CompileResult>
export type GetFormattingOptionsFunc = (fileName: string) => TS.FormatCodeSettings
export type GetCssConfigFunc = (uri: string) => MaybePromise<HoverSettings | undefined>
export type GetComponentInfosFunc = (fileName: string) => MaybePromise<ComponentInfo[]>
export type GetQingkuaiConfigFunc = (fileName: string) => TsPluginQingkuaiConfig | undefined
export type GetScriptNavTreeFunc = (fileName: string) => MaybePromise<TS.NavigationTree | null>
export type GetScriptDiagnosticsFunc = (fileName: string) => MaybePromise<GetDiagnosticResultItem[]>

