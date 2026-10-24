import type { QuickPickItem, Uri } from "vscode"
import type { GeneralFunc } from "../../../types/util"
import type { PromiseWithState } from "../../../types/common"
import type { LanguageClient } from "vscode-languageclient/node"
import type { ProjectKind, TypeScriptSource } from "../../../shared-util/constant"

export type SetStateOptions = Partial<{
    client: LanguageClient
    projectKind: ProjectKind
    serverModulePath: string
    typescriptEntry: string | undefined
    workspaceReadyResolver: GeneralFunc
    workspaceReadyPromise: PromiseWithState
    limitedScriptLanguageFeatures: boolean
}>

export type McpServerPackageInfo = {
    entryCandidates: string[]
    title: string
    version: string
}

export type ModelServerLaunchInfo = {
    command: string
    args: string[]
    cwd: string
    title: string
    version: string
}

export type RenameFilePair = {
    oldUri: Uri
    newUri: Uri
}

export type TypeScriptInstallation = {
    entry: string
    source: TypeScriptSource
    version: string | undefined
    label: string
}

export type TypeScriptLoadFailure = {
    entry: string
    message: string
}

export type EntryInspection =
    | {
          loaded: false
          message: string
      }
    | {
          loaded: true
          version: string | undefined
      }

export type TypeScriptModule = Partial<{
    version: unknown
    createSourceFile: unknown
}>

export type TypeScriptPickItem = QuickPickItem & {
    entry?: string
    action?: "browse" | "reset"
}

export type WorkspaceTypeScriptEntry = [entry: string, folderName: string]
export type ConfigTsServerPluginFunc = (isReconnect: boolean) => Promise<GeneralFunc>
