import type TS from "typescript"
import { SetStateOptions } from "../types/adapter"

export let ts: typeof TS
export let typeDeclarationFilePath: string
export let projectService: TS.server.ProjectService

export function setState(options: SetStateOptions) {
    ;({ ts, projectService, typeDeclarationFilePath } = options)
}
