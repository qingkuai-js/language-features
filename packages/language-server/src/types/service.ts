import type {
    ComponentIdentifierInfo,
    GetClientLanguageConfigResult
} from "../../../../types/communication"
import type { GeneralFunc } from "../../../../types/util"
import type { ProjectKind } from "qingkuai-language-service"
import type { Position, Range } from "vscode-languageserver"
import type { IpcParticipant } from "../../../../shared-util/ipc/types"
import type { CompileResult, PositionFlagKeys } from "qingkuai/compiler"
import type { PromiseWithState, RealPath } from "../../../../types/common"

export type SetStateOptions = Partial<{
    tpic: IpcParticipant
    isTestingEnv: boolean
    projectKind: ProjectKind
    typeRefStatement: string
    tpicConnectedResolver: GeneralFunc
    tpicConnectedPromise: PromiseWithState
    limitedScriptLanguageFeatures: boolean
}>

export type CachedCompileResultItem = CompileResult & {
    uri: string
    version: number
    filePath: RealPath
    getRange: GetRangeFunc
    isSynchronized: boolean
    config: GetClientLanguageConfigResult
    builtInTypeDeclarationEndIndex: number
    componentInfos: ComponentIdentifierInfo[]
    scriptLanguageId: "typescript" | "javascript"
    getOffset: (position: Position) => number
    getPosition: (offset: number) => Position
    getInterIndex: (sourceIndex: number) => number
    getSourceIndex: (interIndex: number, isEnd?: boolean) => number
    isPositionFlagSet: (index: number, key: PositionFlagKeys) => boolean
}

export type GetRangeFunc = (start: number, end?: number) => Range
export type GetSourceIndexFunc = (interIndex: number, isEnd?: boolean) => number
