import type TS from "typescript"
import type { FixedArray } from "./util"
import type { Options as PrettierOptions } from "prettier"

export type NumNumArray = NumNum[]
export type NumNum = FixedArray<number, 2>

export interface OpenFileParams {
    path: string
    start: number
    end: number
}

export interface ExtensionConfiguration {
    typescriptDiagnosticsExplain: boolean
    insertSpaceAroundInterpolation: boolean
    componentTagFormatPreference: "camel" | "kebab"
    htmlHoverTip: ("tag" | "entity" | "attribute")[]
    componentAttributeFormatPreference: "camel" | "kebab"
}

export interface TSFormattingOptions {
    tabSize: number | undefined
    insertSpaces: boolean | undefined
}

export type QingkuaiConfiguration = Partial<{
    resolveImportExtension: boolean
    convenientDerivedDeclaration: boolean
    reserveHtmlComments: "all" | "never" | "development" | "production"
}>

export interface TSClientConfiguration {
    preference: TSUserPreferences
    formatCodeSettings: TSFormatCodeSettings
}

export type PrettierConfiguration = PrettierOptions &
    Partial<{
        spaceAroundInterpolation: boolean
        componentTagFormatPreference: "camel" | "kebab"
        componentAttributeFormatPreference: "camel" | "kebab"
    }>

export type QingkuaiConfigurationWithDir = QingkuaiConfiguration & {
    dir: string
}

export type TSUserPreferences = TS.server.protocol.UserPreferences
export type TSFormatCodeSettings = TS.server.protocol.FormatCodeSettings
