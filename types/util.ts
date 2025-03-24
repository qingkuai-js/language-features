export type Getter = () => any
export type GeneralFunc = (...args: any[]) => any
export type ObjectKeys = string | number | symbol
export type AnyObject<V = any> = Record<ObjectKeys, V>
export type MapValueType<M> = M extends Map<any, infer U> ? U : never

export type Mutable<T extends AnyObject> = {
    -readonly [K in keyof T]: T[K]
}

export type MutableKey<T extends AnyObject, K extends keyof T> = Omit<T, K> & {
    -readonly [P in K]: T[P]
}

export type FixedArray<T, L extends number, R extends T[] = []> = R["length"] extends L
    ? R
    : FixedArray<T, L, [...R, T]>

export interface LoggerTarget {
    write: (msg: string) => void
}
