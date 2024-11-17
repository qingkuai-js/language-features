import type Typescript from "typescript"
import type { FixedArray } from "../../../types/util"

export type DiagnosticKind =
    | "getSemanticDiagnostics"
    | "getSyntacticDiagnostics"
    | "getSuggestionDiagnostics"

export type TS = typeof Typescript
export type TSProgram = Typescript.Program
export type TSProject = Typescript.server.Project
export type TSTypeChecker = Typescript.TypeChecker
export type TSLanguageService = Typescript.LanguageService
export type TSProjectService = Typescript.server.ProjectService
export type TSLanguageServerHost = Typescript.server.ServerHost
export type TSLanguageServiceHost = Typescript.LanguageServiceHost
export type TSPluginCreateInfo = Typescript.server.PluginCreateInfo

export type GlobalTypeExistingInfo = FixedArray<boolean, 2>
