import type {
    ASTPosition,
    CompileResult,
    PositionFlagKeys,
    ASTPositionWithFlag
} from "qingkuai/compiler"
import type { CustomPath, NumNumArray } from "../types/common"
import type { Position, Range } from "vscode-languageserver/node"

import { isUndefined } from "./assert"
import { PositionFlag, util } from "qingkuai/compiler"

export function getScriptKindKey(cr: CompileResult) {
    return cr.inputDescriptor.script.isTS ? "TS" : "JS"
}

// 生成根据源码索引获取qingkuai编译结果中间代码索引的方法
export function getInterIndexGen(stoi: number[]) {
    return (sourceIndex: number) => {
        const interIndex = stoi[sourceIndex]
        if (!isIndexesInvalid(interIndex)) {
            return interIndex
        }

        const preInterIndex = stoi[sourceIndex - 1]
        return isIndexesInvalid(preInterIndex) ? -1 : preInterIndex + 1
    }
}

// 生成根据qingkuai编译结果中间代码索引获取源码索引的方法
export function getSourceIndexGen(itos: number[]) {
    return (interIndex: number, isEnd = false) => {
        const sourceIndex = itos[interIndex]
        if (!isEnd || !isIndexesInvalid(sourceIndex)) {
            return sourceIndex ?? -1
        }

        const preSourceIndex = itos[interIndex - 1]
        return isIndexesInvalid(sourceIndex) ? -1 : preSourceIndex + 1
    }
}

// 生成检查qingkuai编译结果中某个位置标志位设置情况的方法
export function isPositionFlagSetGen(positions: ASTPositionWithFlag[]) {
    return (index: number, key: PositionFlagKeys) => {
        const positionInfo = positions[index]
        if (isUndefined(positionInfo)) {
            return false
        }
        return (positionInfo.flag & PositionFlag[key]) !== 0
    }
}

// 生成从qingkuai编译结果中获取指定索引的位置表达（Language Server Position）
export function getPositionGen(positions: ASTPosition[]) {
    return (offset: number): Position => {
        return {
            line: positions[offset].line - 1,
            character: positions[offset].column
        }
    }
}

// 生成从qingkuai编译结果中获取指定索引的范围表达（Language Server Range）
export function getRangeGen(getPosition: ReturnType<typeof getPositionGen>) {
    return (start: number, end?: number): Range => {
        if (isUndefined(end)) {
            end = start
        }
        return {
            start: getPosition(start),
            end: getPosition(end)
        }
    }
}

export function filePathToComponentName(path: CustomPath, filePath: string) {
    let base = path.base(filePath)
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
                index: i,
                column: j,
                line: i + 1,
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
            recovered.push(Math.max(value - i, -1))
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

export function toLSPosition(position: ASTPosition): Position {
    return { line: position.line - 1, character: position.column }
}

// 检查传入的索引（源码索引或中间代码索引）是否是无效的
export function isIndexesInvalid(...items: (number | undefined)[]) {
    return items.some(item => {
        return !item || item === -1
    })
}
