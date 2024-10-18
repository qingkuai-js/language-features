import type { AnyObject } from "../types/util"

import util from "util"
import { connection, state } from "../packages/language-server/src/state"
import { initialize } from "../packages/language-server/src/supports/initialize"

// Object.keys别名，返回带有类型的键数组
export function typedKeys<T extends AnyObject>(obj: T): Array<keyof T> {
    return Object.keys(obj) as any
}

// 调试打印，将调试信息通知给父进程，并在父进程中输出信息
export function print(...values: any[]) {
    const initialized = state.isInitialized
    const inspectValues = values.map(value => {
        return util.inspect(value, {
            depth: null,
            colors: !initialized
        })
    })
    const inspectValue = inspectValues.join(" ")
    if (state.isInitialized) {
        console.log(inspectValue)
    } else {
        connection.sendNotification("development-debug", inspectValue)
    }
}
