import type { LanguageClient } from "vscode-languageclient/node"

export type SetStateOptions = Partial<{
    client: LanguageClient
    limitedScriptLanguageFeatures: boolean
}>
