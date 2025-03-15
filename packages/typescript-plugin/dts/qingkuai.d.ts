type GeneralFunc = (...args: any) => any
type AnyObject = Record<AnyObjectKey, any>
type Constructible = new (..._: any) => any
type AnyObjectKey = string | number | symbol
type NotFunction<T> = Exclude<T, GeneralFunc>
type ExtractResolveType<T> = T extends Promise<infer R> ? R : unknown
type ExtractSlotNames<T extends Constructible> = keyof ConstructorParameters<T>[2]

interface DerivedFunc {
    <T>(expression: NotFunction<T>): T
    <T>(getter: () => T): T
}

interface ReloadedGetKVPair {
    <T>(_: Set<T>): [number, T]
    <K, V>(_: Map<K, V>): [K, V]
    <T>(_: Array<T>): [number, T]
    (_: number): [number, number]
    <K extends string | number | symbol, V>(_: Record<K, V>): [K, V]
}

interface WatchFunc {
    <T>(
        expression: NotFunction<T>,
        callback: (pre: NotFunction<T>, cur: NotFunction<T>) => void
    ): () => void
    <T>(getter: () => T, callback: (pre: T, cur: T) => void): () => void
}

declare const __c__: {
    Receiver: any

    GetKVPair: ReloadedGetKVPair
    GetTypedValue: <T>() => T
    GetResolve: <T>(_: T) => ExtractResolveType<T>
    GetSlotProp: <T extends Constructible, K extends ExtractSlotNames<T>>(
        _: T,
        __: K
    ) => Readonly<ConstructorParameters<T>[2][K]>

    SatisfyString: (_: string) => void
    SatisfyBoolean: (_: boolean) => void
    SatisfyPromise: (_: Promise<any>) => void
    SatisfyComponent: <T extends Constructible>(
        _: T,
        __: ConstructorParameters<T>[0],
        ___: ConstructorParameters<T>[1]
    ) => void
    SatisfyRefGroup: <T extends Set<any> | Array<any>>(
        _: T,
        __: T extends Set<infer U> ? U : T extends Array<infer U> ? U : any
    ) => void

    [K: AnyObjectKey]: any
}

declare const wat: WatchFunc
declare const waT: WatchFunc
declare const Wat: WatchFunc
declare const der: DerivedFunc
declare function stc<T = undefined>(value: T): T
declare function rea<T = undefined>(value: T, level?: number): T
