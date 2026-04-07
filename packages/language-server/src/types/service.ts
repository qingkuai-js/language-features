import type { GeneralFunc } from "../../../../types/util"
import type { PromiseWithState } from "../../../../types/common"
import type { ProjectKind } from "../../../../shared-util/constant"
import type { IpcParticipant } from "../../../../shared-util/ipc/types"

export type SetStateOptions = Partial<{
    tpic: IpcParticipant
    isTestingEnv: boolean
    projectKind: ProjectKind
    tpicConnectedResolver: GeneralFunc
    tpicConnectedPromise: PromiseWithState
    limitedScriptLanguageFeatures: boolean
}>
