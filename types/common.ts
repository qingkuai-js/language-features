import type TS from "typescript"
import type { FixedArray } from "./util"
import type { Options as PrettierOptions } from "prettier"

export type NumNumArray = NumNum[]
export type NumNum = FixedArray<number, 2>
export type FuncWithCallBack = (cb: () => void) => void

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

export type QingkuaiConfigurationWithDir = QingkuaiConfiguration & {
    dir: RealPath
}

export type TSUserPreferences = TS.server.protocol.UserPreferences
export type TSFormatCodeSettings = TS.server.protocol.FormatCodeSettings
