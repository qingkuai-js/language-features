export function isString(v: any): v is string {
    return typeof v === "string"
}

export function isEmptyString(v: any): v is "" {
    return v === ""
}

export function isUndefined(v: any): v is undefined {
    return v === undefined
}
