export type QingkuaiConfigurationWithDir = QingkuaiConfiguration & {
    dir: string
}

export type QingkuaiConfiguration = Partial<{
    resolveImportExtension: boolean
    convenientDerivedDeclaration: boolean
    reserveHtmlComments: "all" | "never" | "development" | "production"
}>

export interface ExtensionConfiguration {
    typescriptDiagnosticsExplain: boolean
    componentTagFormatPreference: "camel" | "kebab"
    htmlHoverTip: ("tag" | "entity" | "attribute")[]
}
