import type { GeneralFunc } from "../../../../types/util"
import type { ProjectKind } from "qingkuai-language-service"
import type { PromiseWithState } from "../../../../types/common"
import type { IpcParticipant } from "../../../../shared-util/ipc/types"

export type SetStateOptions = Partial<{
    tpic: IpcParticipant
    isTestingEnv: boolean
    projectKind: ProjectKind
    typeDeclarationFilePath: string
    tpicConnectedResolver: GeneralFunc
    tpicConnectedPromise: PromiseWithState
    limitedScriptLanguageFeatures: boolean
}>
