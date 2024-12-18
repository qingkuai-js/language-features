import TS from "typescript"

export interface OpenFileParams {
    path: string
    start: number
    end: number
}

export interface ExtensionConfiguration {
    typescriptDiagnosticsExplain: boolean
    componentTagFormatPreference: "camel" | "kebab"
    htmlHoverTip: ("tag" | "entity" | "attribute")[]
}

export interface TSFormattingOptions {
    tabSize: number | undefined
    insertSpaces: boolean | undefined
}

export type PrettierConfiguration = Partial<{
    semi: boolean
    filepath: string
    rangeEnd: number
    rangeStart: number
    singleQuote: boolean
    insertPragma: boolean
    requirePragma: boolean
    jsxSingleQuote: boolean
    bracketSpacing: boolean
    bracketSameLine: boolean
    experimentalTernaries: boolean
    singleAttributePerLine: boolean
    vueIndentScriptAndStyle: boolean
    arrowParens: "avoid" | "always"
    trailingComma: "none" | "es5" | "all"
    endOfLine: "auto" | "lf" | "crlf" | "cr"
    proseWrap: "always" | "never" | "preserve"
    embeddedLanguageFormatting: "auto" | "off"
    quoteProps: "as-needed" | "consistent" | "preserve"
    htmlWhitespaceSensitivity: "css" | "strict" | "ignore"
    jsxBracketSameLine?: boolean
}>

export type QingkuaiConfiguration = Partial<{
    resolveImportExtension: boolean
    convenientDerivedDeclaration: boolean
    reserveHtmlComments: "all" | "never" | "development" | "production"
}>

export interface TSClientConfiguration {
    preference: TSUserPreferences
    formatCodeSettings: TSFormatCodeSettings
}

export type QingkuaiConfigurationWithDir = QingkuaiConfiguration & {
    dir: string
}

export type TSUserPreferences = TS.server.protocol.UserPreferences
export type TSFormatCodeSettings = TS.server.protocol.FormatCodeSettings
