import type { AnyObject } from "../types/util"

// 获取数组的最后一个元素
export function lastElem<T extends any[]>(arr: T): T[number] {
    return arr[arr.length - 1]
}

// Object.keys别名，返回带有类型的键数组
export function typedKeys<T extends AnyObject>(obj: T): Array<keyof T> {
    return Object.keys(obj) as any
}
