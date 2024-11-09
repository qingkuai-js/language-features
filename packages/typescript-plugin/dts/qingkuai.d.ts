interface ReloadedGetKVPair {
    <T>(_: Set<T>): [number, T]
    <K, V>(_: Map<K, V>): [K, V]
    <T>(_: Array<T>): [number, T]
    (_: number): [number, number]
    <K extends string | number | symbol, V>(_: Record<K, V>): [K, V]
}
type ExtractResolveType<T> = T extends Promise<infer R> ? R : any

declare const __c__: {
    SatisfyString: (_: string) => void
    SatisfyBoolean: (_: boolean) => void
    SatisfyPromise: (_: Promise<any>) => void
    SatisfyRefGroup: <T extends Set<any> | Array<any>>(
        _: T,
        __: T extends Set<infer U> ? U : T extends Array<infer U> ? U : any
    ) => void
    SatisfyForDirective: (
        _: number | any[] | Set<any> | Map<any, any> | Record<number | string | symbol, any>
    ) => void

    GetKVPair: ReloadedGetKVPair
    SatisfyResolve: <T>(_: T) => ExtractResolveType<T>
}

declare const wat: watchFunc
declare const waT: watchFunc
declare const Wat: watchFunc
declare function stc<T>(value: T): T
declare function der<T>(value: T | (() => T)): T
declare function rea<T>(value: T, level?: number): T
type watchFunc = <T>(target: T | ((pre: T, cur: T) => T)) => () => void
