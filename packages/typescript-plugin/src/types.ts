import type Typescript from "typescript"
import type { OriSourceFile } from "./constant"
import type { commonMessage, SlotInfo } from "qingkuai/compiler"
import type { Diagnostic, ResolvedModuleWithFailedLookupLocations, SourceFile } from "typescript"

export type DiagnosticKind =
    | "getSemanticDiagnostics"
    | "getSyntacticDiagnostics"
    | "getSuggestionDiagnostics"

export interface QingKuaiFileInfo {
    offset: number
    version: number
    isOpen: boolean
    itos: number[]
    interCode: string
    slotInfo: SlotInfo
    mappingFileName: string
    getPos(pos: number): number
    scriptKind: Typescript.ScriptKind
}

export type RelatedInfoFile =
    | SourceFile
    | undefined
    | {
          fileName: string
          [OriSourceFile]: SourceFile
      }

export type QingKuaiCommonMessage = typeof commonMessage
export type QingKuaiDiagnostic = Omit<Diagnostic, "file">

export type TS = typeof Typescript
export type TSProjectService = Typescript.server.ProjectService
export type TSPluginCreateInfo = Typescript.server.PluginCreateInfo
