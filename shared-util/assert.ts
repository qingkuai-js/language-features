export function debugAssert(v: any) {
    if (!v) {
        debugger
    }
}

export function isNull(v: any): v is null {
    return v === null
}

export function isArray(v: any): v is any[] {
    return Array.isArray(v)
}

export function isString(v: any): v is string {
    return typeof v === "string"
}

export function isNumber(v: any): v is number {
    return typeof v === "number"
}

export function isEmptyString(v: any): v is "" {
    return v === ""
}

export function isFunction(v: any): v is Function {
    return typeof v === "function"
}

export function isUndefined(v: any): v is undefined {
    return v === undefined
}

export function isPromise(v: any): v is Promise<any> {
    return v instanceof Promise
}

export function isBoolean(v: any): v is boolean {
    return typeof v === "boolean"
}

export function isQingkuaiFileName(fileName: string) {
    return fileName.endsWith(".qk")
}
