import type TS from "typescript"
import type { Pair } from "../../../../types/common"

export interface DiffResult {
    start: number
    end: number
    content: string
}

export interface ExtractedSlotName {
    name: string
    sourceRange: Pair<number>
}

export interface ExtractedSlotContext {
    property: {
        name: string
        sourceRange: Pair<number>
    }
    valueType: string
}

export interface SetStateOptions {
    ts: typeof TS
    typeDeclarationFilePath: string
    projectService: TS.server.ProjectService
}

export type GlobalTypes = Partial<
    Record<
        "Props" | "Refs",
        {
            defaultDeclaration: TS.Node
            used?: TS.Type
        }
    >
>

export type GlobalTypeDeclarationNode =
    | TS.JSDocTypedefTag
    | TS.TypeAliasDeclaration
    | TS.InterfaceDeclaration
