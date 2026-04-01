import type TS from "typescript"

import type { IpcParticipant } from "../../../shared-util/ipc/types"
import type { TypescriptAdapter } from "qingkuai-language-service/adapters"

export type SetStateOptions = Partial<{
    ts: typeof TS
    server: IpcParticipant
    adapter: TypescriptAdapter
    projectService: TS.server.ProjectService
}>
