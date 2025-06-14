import type { CustomPath, PromiseWithState } from "../types/common"
import type { AnyObject, GeneralFunc } from "../types/util"

import { randomBytes } from "node:crypto"
import { basename, dirname, extname, relative, resolve } from "node:path"

export function sleep(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}

export function stringify(v: any) {
    return JSON.stringify(v)
}

export function runAll(funcs: GeneralFunc[]) {
    funcs.forEach(func => func())
}

export function escapeRegExp(text: string) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")
}

// 生成一个稍后解决的Promise，此方法返回一个Promise和它的resovle方法
// 返回的Promise是经过包装的，可以访问其state属性获取它当前所处的状态
export function generatePromiseAndResolver() {
    let resolver!: GeneralFunc
    const promise: PromiseWithState = new Promise(resolve => {
        resolver = (value: any) => {
            resolve(value)
            promise.state = "fullfilled"
        }
    }) as any
    promise.state = "pending"
    return [promise, resolver] as const
}

export function generateCustomPathByNodePath(): CustomPath {
    return {
        ext(path: string) {
            return extname(path)
        },
        dir(path: string) {
            return dirname(path)
        },
        resolve(...paths: string[]) {
            return resolve(...paths)
        },
        relative(from: string, to: string) {
            return relative(from, to)
        },
        base(path: string) {
            return basename(path, extname(path))
        }
    }
}

// 防抖函数生成器，getId是一个获取调用id的方法，执行这个方法时会传入
// 原始函数的入参，只有当多个调用的id相同时才会被认为需要防抖介入的调用
export function debounce<T extends GeneralFunc>(
    fn: T,
    delay: number,
    getId?: (...args: Parameters<T>) => any
) {
    const timers = new Map<any, NodeJS.Timeout>()
    return function (this: any, ...args: Parameters<T>) {
        const id = getId?.(...args)
        if (timers.has(id)) {
            clearTimeout(timers.get(id))
        }
        timers.set(
            id,
            setTimeout(() => {
                fn.apply(this, args)
                timers.delete(id)
            }, delay)
        )
    }
}

// 生成指定长度的随机哈希字符串
export function createRandomHash(length: number) {
    const bs = randomBytes(Math.ceil(length / 2))
    return bs.toString("hex").slice(0, length)
}

// 获取数组的最后一个元素
export function lastElem<T extends any[]>(arr: T): T[number] {
    return arr[arr.length - 1]
}

// Object.keys别名，返回带有类型的键数组
export function typedKeys<T extends AnyObject>(obj: T): Array<keyof T> {
    return Object.keys(obj) as any
}

// 从对象中排除指定的属性
export function excludeProperty<T extends AnyObject, K extends keyof T>(
    obj: T,
    ...keys: K[]
): Omit<T, (typeof keys)[number]> {
    const ret: any = {}
    const set = new Set(keys)
    for (const key of Reflect.ownKeys(obj)) {
        // @ts-expect-error
        if (!set.has(key)) {
            ret[key] = obj[key]
        }
    }
    return ret
}
