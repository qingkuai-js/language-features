import type { NumNumArray } from "../types/common"
import type { ASTPosition, ASTPositionWithFlag, CompileResult } from "qingkuai/compiler"

// 通过qingkuai编译结果获取 typescript.ScriptKind 对应的键
export function getScriptKindKey(cr: CompileResult) {
    return cr.inputDescriptor.script.isTS ? "TS" : "JS"
}

// 压缩中间代码索引到源码索引的映射信息
export function compressItos(itos: number[]) {
    const compressed: NumNumArray = []
    for (let i = 1, count = 1; i <= itos.length; i++) {
        if (
            (itos[i] === -1 && itos[i] === itos[i - 1]) ||
            (itos[i] !== -1 && itos[i] === itos[i - 1] + 1)
        ) {
            count++
        } else {
            compressed.push([itos[i - 1], count])
            count = 1
        }
    }
    return compressed
}

// 压缩positions位置信息
export function compressPosition(positions: ASTPosition[]) {
    const compressed: NumNumArray = []
    for (let i = 1, count = 1; i <= positions.length; i++) {
        if (positions[i]?.line === positions[i - 1].line) {
            count++
        } else {
            compressed.push([positions[i - 1].line, count])
            count = 1
        }
    }
    return compressed
}

// 压缩PositionFlag信息
export function compressPositionFlags(positions: ASTPositionWithFlag[]) {
    const compressed: NumNumArray = []
    const flags = positions.map(p => p.flag)
    for (let i = 1, count = 1; i <= flags.length; i++) {
        if (flags[i] === flags[i - 1]) {
            count++
        } else {
            compressed.push([flags[i - 1], count])
            count = 1
        }
    }
    return compressed
}
