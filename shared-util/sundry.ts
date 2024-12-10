import type { AnyObject, GeneralFunc } from "../types/util"

// JSON.stringify别名
export function stringify(v: any) {
    return JSON.stringify(v)
}

// 驼峰命名转串型命名格式
export function camel2Kebab(s: string) {
    return s.replace(/[A-Z]/g, (m, i) => {
        return (i === 0 ? "" : "-") + m.toLocaleLowerCase()
    })
}

// 生成一个稍后解决的Promise，此方法返回一个Promise和它的resovle方法
// 返回的Promise是经过包装的，可以访问其state属性获取它当前所处的状态
export function generatePromiseAndResolver() {
    let resolver!: GeneralFunc
    const promise: Promise<any> & {
        state: "fullfilled" | "pending"
    } = new Promise(resolve => {
        resolver = (value: any) => {
            resolve(value)
            promise.state = "fullfilled"
        }
    }) as any
    promise.state = "pending"
    return [promise, resolver] as const
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
            }, delay)
        )
    }
}

// 生成指定长度的随机哈希字符串
export function createRandomHash(length: number) {
    if (length <= 0) {
        return ""
    }

    const maxValue = parseInt("0x" + "f".repeat(length))
    return Math.floor(Math.random() * maxValue).toString(16)
}

// 获取数组的最后一个元素
export function lastElem<T extends any[]>(arr: T): T[number] {
    return arr[arr.length - 1]
}

// Object.keys别名，返回带有类型的键数组
export function typedKeys<T extends AnyObject>(obj: T): Array<keyof T> {
    return Object.keys(obj) as any
}
