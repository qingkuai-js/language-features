import type { GeneralFunc } from "../../../types/util"
import type { ProjectKind } from "../../../shared-util/constant"
import type { LanguageClient } from "vscode-languageclient/node"

export type SetStateOptions = Partial<{
    client: LanguageClient
    projectKind: ProjectKind
    serverModulePath: string
    limitedScriptLanguageFeatures: boolean
}>

export type ConfigTsServerPluginFunc = (isReconnect: boolean) => Promise<GeneralFunc>
