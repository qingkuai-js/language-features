import type { CompileResult } from "qingkuai/compiler"

export type CachedCompileResultItem = CompileResult & {
    source: string
    version: number
}
