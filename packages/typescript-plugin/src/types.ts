import type Typescript from "typescript"
import type { FixedArray } from "../../../types/util"

export type DiagnosticKind =
    | "getSemanticDiagnostics"
    | "getSyntacticDiagnostics"
    | "getSuggestionDiagnostics"

export interface OpenQkFileInfo {
    mappingFileName: string
    scriptKind: Typescript.ScriptKind
}

export type TS = typeof Typescript
export type TSProject = Typescript.server.Project
export type TSLanguageService = Typescript.LanguageService
export type TSProjectService = Typescript.server.ProjectService
export type TSLanguageServerHost = Typescript.server.ServerHost
export type TSLanguageServiceHost = Typescript.LanguageServiceHost
export type TSPluginCreateInfo = Typescript.server.PluginCreateInfo
