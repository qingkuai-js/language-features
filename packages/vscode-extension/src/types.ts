import type { GeneralFunc } from "../../../types/util"
import type { LanguageClient } from "vscode-languageclient/node"

export type SetStateOptions = Partial<{
    client: LanguageClient
    serverModulePath: string
    limitedScriptLanguageFeatures: boolean
}>

export type ConfigTsServerPluginFunc = (isReconnect: boolean) => Promise<GeneralFunc>
