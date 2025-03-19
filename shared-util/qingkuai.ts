import type { NumNumArray } from "../types/common"
import type { ASTPosition, ASTPositionWithFlag, CompileResult } from "qingkuai/compiler"

import { util } from "qingkuai/compiler"
import { basename, extname } from "node:path"

export function getScriptKindKey(cr: CompileResult) {
    return cr.inputDescriptor.script.isTS ? "TS" : "JS"
}

export function filePathToComponentName(p: string) {
    let base = basename(p, extname(p))
    base = base.replace(/[^a-zA-Z]*/, "")
    base = base.replace(/[^a-zA-Z\d]/g, "")
    if (!base) {
        return "Anonymous"
    }
    return util.kebab2Camel(base, true)
}

// 恢复被压缩的positions信息
export function recoverPositions(cp: number[]) {
    const recovered: ASTPosition[] = []
    for (let i = 0; i < cp.length; i++) {
        for (let j = 0; j < cp[i]; j++) {
            recovered.push({
                line: i + 1,
                column: j,
                index: recovered.length + 1
            })
        }
    }
    return recovered
}

// 恢复被压缩的itos信息
export function recoverItos(citos: NumNumArray) {
    const recovered: number[] = []
    for (const [value, count] of citos) {
        if (value === -1) {
            for (let i = 0; i < count; i++) {
                recovered.push(-1)
            }
            continue
        }
        for (let i = count - 1; i >= 0; i--) {
            recovered.push(value - i)
        }
    }
    return recovered
}

// 恢复被压缩的positionFlag信息
export function recoverPostionFlags(cpf: NumNumArray) {
    const recovered: number[] = []
    for (const [value, count] of cpf) {
        for (let i = 0; i < count; i++) {
            recovered.push(value)
        }
    }
    return recovered
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
    const compressed: number[] = []
    for (let i = 1, line = 1, count = 1; i <= positions.length; i++) {
        if (positions[i]?.line === line) {
            count++
        } else {
            compressed.push(count)
            count = 1
            line++
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

// 检查传入的源码索引是否是无效的
export function isSourceIndexesInvalid(...items: (number | undefined)[]) {
    return items.some(item => {
        return !item || item === -1
    })
}
