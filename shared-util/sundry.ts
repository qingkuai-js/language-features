import type { AnyObject, GeneralFunc } from "../types/util"

import { isNull } from "./assert"

// 防抖函数生成器
export function debounce(fn: GeneralFunc, delay = 1000) {
    let timer: NodeJS.Timeout | null = null
    return function (this: any, ...args: any) {
        if (!isNull(timer)) {
            clearTimeout(timer)
        }
        timer = setTimeout(() => {
            fn.apply(this, args)
        }, delay)
    }
}

// 生成一个稍后解决的Promise，此方法返回一个Promise和它的resovle方法
export function generatePromiseAndResolver() {
    let resolver!: GeneralFunc
    return [
        new Promise(resolve => {
            resolver = resolve
        }),
        resolver
    ] as const
}

// 获取数组的最后一个元素
export function lastElem<T extends any[]>(arr: T): T[number] {
    return arr[arr.length - 1]
}

// Object.keys别名，返回带有类型的键数组
export function typedKeys<T extends AnyObject>(obj: T): Array<keyof T> {
    return Object.keys(obj) as any
}
