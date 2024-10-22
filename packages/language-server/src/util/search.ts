import type { FixedArray } from "../../../../types/util"

// 找到指定offset所处的事件修饰符的名称及范围，不存在时返回undefined
// 注意：调用此方法要确保offse在一个事件属性范围内，若不在事件属性范围内并不是一定返回undefined
export function findEventModifier(source: string, offset: number, range: FixedArray<number, 2>) {
    let endIndex = offset
    let startIndex = offset - 1

    while (endIndex < range[1] && source[endIndex] !== "|") {
        endIndex++
    }
    while (startIndex > range[0] && source[startIndex] !== "|") {
        startIndex--
    }

    if (source[startIndex] !== "|") {
        return undefined
    }

    const modifierRange: FixedArray<number, 2> = [startIndex + 1, endIndex]
    return {
        range: modifierRange,
        name: source.slice(...modifierRange)
    }
}
