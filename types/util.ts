export type GeneralFunc = (...args: any[]) => any
export type ObjectKeys = string | number | symbol
export type AnyObject<V = any> = Record<ObjectKeys, V>

export type FixedArray<T, L extends number, R extends T[] = []> = R["length"] extends L
    ? R
    : FixedArray<T, L, [...R, T]>

export interface LoggerTarget {
    info: (msg: string) => void
    warn: (msg: string) => void
    error: (msg: string) => void
}
