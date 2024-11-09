import type { CompileResult } from "qingkuai/compiler"

// 通过qingkuai编译结果获取 typescript.ScriptKind 对应的键
export function getScriptKindKey(cr: CompileResult) {
    return cr.inputDescriptor.script.isTS ? "TS" : "JS"
}
