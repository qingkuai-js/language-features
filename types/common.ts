import type TS from "typescript"
import type { FixedArray } from "./util"
import type { Options as PrettierOptions } from "prettier"
import type { Position, Range } from "vscode-languageserver/node"
import type { ComponentIdentifierInfo, GetClientLanguageConfigResult } from "./communication"
import type { CompileResult as QingkuaiCompileResult, PositionFlagKeys } from "qingkuai/compiler"

export type NumNumArray = NumNum[]
export type NumNum = FixedArray<number, 2>
export type MaybePromise<T = any> = T | Promise<T>
export type FuncWithCallBack = (cb: () => void) => void
export type GetRangeFunc = (start: number, end?: number) => Range

export type RealPath = string & {
    _: never
}

export type PromiseWithState<T = any> = Promise<T> & {
    state: "fullfilled" | "pending"
}

export interface OpenFileParams {
    path: string
    start: number
    end: number
}

export interface CustomFS {
    read: (path: string) => string
    exist: (path: string) => boolean
}

export interface CustomPath {
    ext: (path: string) => string
    dir: (path: string) => string
    base: (path: string) => string
    resolve: (...segments: string[]) => string
    relative: (from: string, to: string) => string
}

export interface ExtensionConfiguration {
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

export type QingkuaiConfiguration = Partial<{
    exposeDestructions: boolean
    exposeDependencies: boolean
    insertTipComments: boolean
    resolveImportExtension: boolean
    convenientDerivedDeclaration: boolean
    reserveHtmlComments: "all" | "never" | "development" | "production"
}>

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

export type CompileResult = QingkuaiCompileResult & {
    uri: string
    version: number
    filePath: RealPath
    getRange: GetRangeFunc
    isSynchronized: boolean
    builtInTypeDeclarationEndIndex: number
    componentInfos: ComponentIdentifierInfo[]
    scriptLanguageId: "typescript" | "javascript"
    config: Partial<GetClientLanguageConfigResult>

    getOffset: (position: Position) => number
    getPosition: (offset: number) => Position
    getInterIndex: (sourceIndex: number) => number
    getSourceIndex: (interIndex: number, isEnd?: boolean) => number
    isPositionFlagSet: (index: number, key: PositionFlagKeys) => boolean
}

export type QingkuaiConfigurationWithDir = QingkuaiConfiguration & {
    dir: RealPath
}

export type TSUserPreferences = TS.server.protocol.UserPreferences
export type TSFormatCodeSettings = TS.server.protocol.FormatCodeSettings
