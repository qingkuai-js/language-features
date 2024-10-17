import util from "util"
import { AnyObject } from "./types"

// print debugging info, the informations will be output to
// "QingKuai Language Server" item of output tab of extension host.
export function print(...values: any[]) {
    const inspectValues = values.map(value => {
        return util.inspect(value, { depth: null })
    })
    console.log(inspectValues.join(" "))
}

// Object.keys别名，返回带有类型的键数组
export function typedKeys<T extends AnyObject>(obj: T): Array<keyof T> {
    return Object.keys(obj) as any
}
