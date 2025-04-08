import type TS from "typescript"
import type { SlotInfo } from "qingkuai/compiler"
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

export type SetStateOptions = Partial<{
    ts: typeof TS
    server: IpcParticipant
    session: TS.server.Session
    lsProjectKindChanged: boolean
    projectService: TS.server.ProjectService
}>

export type ConvertProtocolTextSpanWithContextVerifier = (
    fileName: string,
    sourceIndex: number,
    itemKind: "start" | "end" | "contextStart" | "contextEnd"
) => boolean
