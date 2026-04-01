import type TS from "typescript"

import type { Pair, TsNormalizedPath } from "../../../../types/common"

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

export interface AdapterTsProjectService {
    readonly serverMode: TS.LanguageServiceMode
    openFiles: Map<TS.Path, TsNormalizedPath | undefined>
    toPath(fileName: string): TS.Path
    getDefaultProjectForFile(
        fileName: TsNormalizedPath,
        ensureProject: boolean
    ): AdapterTsProject | undefined
    forEachProject?(callback: (project: TS.server.Project) => void): void
}

export interface AdapterTsProject {
    getScriptFileNames(): string[]
    getLanguageService(ensureSynchronized?: boolean): TS.LanguageService
    getScriptKind?: TS.LanguageServiceHost["getScriptKind"]
    getScriptVersion?: TS.LanguageServiceHost["getScriptVersion"]
    getScriptSnapshot?: TS.LanguageServiceHost["getScriptSnapshot"]
    resolveModuleNameLiterals?: TS.LanguageServiceHost["resolveModuleNameLiterals"]
}
