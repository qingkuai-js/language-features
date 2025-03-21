import type {
    GetClientConfigResult,
    ComponentIdentifierInfo
} from "../../../../types/communication"
import type { ProjectKind } from "../constants"
import type { Position, Range } from "vscode-languageserver"
import type { IpcParticipant } from "../../../../shared-util/ipc/types"
import type { CompileResult, PositionFlagKeys } from "qingkuai/compiler"

export type CodeLensConfig = {
    referencesCodeLens: {
        enabled: boolean
        showOnAllFunctions: boolean
    }
    implementationsCodeLens?: {
        enabled: boolean
        showOnInterfaceMethods: boolean
    }
}

export type CodeLensData = {
    fileName: string
    interIndex: number
    position: Position
    slotName?: string
    componentName?: string
    type: "reference" | "implementation"
}

export type SetStateOptions = Partial<{
    tpic: IpcParticipant
    isTestingEnv: boolean
    projectKind: ProjectKind
    typeRefStatement: string
}>

export type CachedCompileResultItem = CompileResult & {
    version: number
    filePath: string
    getRange: GetRangeFunc
    isSynchronized: boolean
    config: GetClientConfigResult
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
