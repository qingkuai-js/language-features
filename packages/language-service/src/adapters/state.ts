import type TS from "typescript"
import { SetStateOptions } from "../types/adapter"

export let ts: typeof TS

export function setState(options: SetStateOptions) {
    ;({ ts } = options)
}
