import type TS from "typescript"
import type { FixedArray } from "./util"
import type { Range } from "vscode-languageserver-types"
import type { Options as PrettierOptions } from "prettier"
import type { GetClientLanguageConfigResult } from "./communication"
import type { TextDocument } from "vscode-languageserver-textdocument"
import type { ASTLocation, CompileIntermediateResult } from "qingkuai/compiler"

export type Pair<T = any> = FixedArray<T, 2>
export type MaybePromise<T = any> = T | Promise<T>
export type TsNormalizedPath = TS.server.NormalizedPath
export type FuncWithCallBack = (cb: () => void) => void

export interface GetVscodeRangeFunc {
    (loc: ASTLocation): Range
    (start: number, end?: number): Range
}

export type PromiseWithState<T = any> = Promise<T> & {
    state: "fullfilled" | "pending"
}

export interface OpenFileParams {
    path: string
    start: number
    end: number
}

export interface AdapterFS {
    read: (path: string) => string
    exist: (path: string) => boolean
}

export interface AdapterPath {
    ext: (path: string) => string
    dir: (path: string) => string
    base: (path: string) => string
    resolve: (...segments: string[]) => string
    relative: (from: string, to: string) => string
}

export interface ComponentAttributeItem {
    kind: "Props" | "Refs"
    name: string
    type: string
    optional: boolean
    mayBeEvent: boolean
    couldBeString: boolean
    stringCandidates: string[]
}

export interface ComponentInfo {
    name: string
    type: string
    imported: boolean
    slotNames: string[]
    relativePath: string
    absolutePath: string
    attributes: ComponentAttributeItem[]
}

export interface ExtensionConfiguration {
    hoverTipReactiveStatus: boolean
    typescriptDiagnosticsExplain: boolean
    insertSpaceAroundInterpolation: boolean
    additionalCodeLens: ("component" | "slot")[]
    componentTagFormatPreference: "camel" | "kebab"
    htmlHoverTip: ("tag" | "entity" | "attribute")[]
    componentAttributeFormatPreference: "camel" | "kebab"
}

export interface TSFormattingOptions {
    tabSize: number | undefined
    insertSpaces: boolean | undefined
}

export type QingkuaiConfiguration = {
    interpretiveComments: boolean
    resolveImportExtension: boolean
    shorthandDerivedDeclaration: boolean
    reactivityMode: "reactive" | "shallow"
    whitespace: "preserve" | "trim" | "collapse" | "trim-collapse"
    preserveHtmlComments: "all" | "never" | "development" | "production"
}

export interface TSClientConfiguration {
    preference: TSUserPreferences
    formatCodeSettings: TSFormatCodeSettings
}

export type PrettierConfiguration = PrettierOptions & {
    qingkuai: Partial<{
        spaceAroundInterpolation: boolean
        componentTagFormatPreference: "camel" | "kebab"
        componentAttributeFormatPreference: "camel" | "kebab"
    }>
}

export type CompileResult = CompileIntermediateResult & {
    uri: string
    version: number
    filePath: string
    document: TextDocument
    isSynchronized: boolean
    getVscodeRange: GetVscodeRangeFunc
    scriptLanguageId: "typescript" | "javascript"
    config: GetClientLanguageConfigResult | null
}

export type TsPluginQingkuaiConfig = Pick<QingkuaiConfiguration, "resolveImportExtension"> &
    Pick<ExtensionConfiguration, "hoverTipReactiveStatus">

export type TSUserPreferences = TS.server.protocol.UserPreferences
export type TSFormatCodeSettings = TS.server.protocol.FormatCodeSettings
