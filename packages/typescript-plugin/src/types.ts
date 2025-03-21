import type TS from "typescript"
import type { ORI_SOURCE_FILE } from "./constant"
import type { QingKuaiSnapShot } from "./snapshot"
import type { Diagnostic, SourceFile } from "typescript"
import type { commonMessage, SlotInfo } from "qingkuai/compiler"
import type { IpcParticipant } from "../../../shared-util/ipc/types"

export interface QingKuaiFileInfo {
    offset: number
    version: number
    isOpen: boolean
    itos: number[]
    interCode: string
    slotInfo: SlotInfo
    mappingFileName: string
    scriptKind: TS.ScriptKind
    getPos(pos: number): number
}

export type DiagnosticKind =
    | "getSemanticDiagnostics"
    | "getSyntacticDiagnostics"
    | "getSuggestionDiagnostics"

export type SetStateOptions = Partial<{
    ts: typeof TS
    server: IpcParticipant
    session: TS.server.Session
    lsProjectKindChanged: boolean
    projectService: TS.server.ProjectService
}>

export type RelatedInfoFile =
    | SourceFile
    | undefined
    | {
          fileName: string
          [ORI_SOURCE_FILE]: SourceFile
      }

export type ConvertProtocolTextSpanWithContextVerifier = (
    sourceIndex: number,
    qingkuaiSnapshot: QingKuaiSnapShot,
    itemKind: "start" | "end" | "contextStart" | "contextEnd"
) => boolean

export type QingKuaiCommonMessage = typeof commonMessage
export type QingKuaiDiagnostic = Omit<Diagnostic, "file">
