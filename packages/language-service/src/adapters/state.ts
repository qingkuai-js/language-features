import type TS from "typescript"
import { SetStateOptions } from "../types/adapter"

export let ts: typeof TS
export let typeDeclarationFilePath: string

export function setState(options: SetStateOptions) {
    ;({ ts, typeDeclarationFilePath } = options)
}
