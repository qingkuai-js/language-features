import type Typescript from "typescript"

export type DiagnosticKind =
    | "getSemanticDiagnostics"
    | "getSyntacticDiagnostics"
    | "getSuggestionDiagnostics"

export interface QingKuaiFileInfo {
    offset: number
    version: number
    isOpen: boolean
    mappingFileName: string
    getPos(pos: number): number
    scriptKind: Typescript.ScriptKind
}

export type TS = typeof Typescript
export type TSProject = Typescript.server.Project
export type TSLanguageService = Typescript.LanguageService
export type TSProjectService = Typescript.server.ProjectService
export type TSLanguageServerHost = Typescript.server.ServerHost
export type TSLanguageServiceHost = Typescript.LanguageServiceHost
export type TSPluginCreateInfo = Typescript.server.PluginCreateInfo
