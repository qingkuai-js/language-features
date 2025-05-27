/// <reference lib="dom" />

type GeneralFunc = (...args: any) => any
type AnyObject = Record<AnyObjectKey, any>
type Constructible = new (..._: any) => any
type AnyObjectKey = string | number | symbol
type NotFunction<T> = Exclude<T, GeneralFunc>
type ExtractResolveType<T> = T extends Promise<infer R> ? R : unknown
type ExtractSlotNames<T extends Constructible> = keyof ConstructorParameters<T>[2]

type ExtractElementKind<K> = K extends keyof HTMLElementTagNameMap
    ? HTMLElementTagNameMap[K]
    : HTMLElement

type ExtractEventHandlerKind<K> = K extends keyof HTMLElementEventMap
    ? HTMLElementEventMap[K]
    : Event

type UnescapeOptions = Partial<{
    escapeTags?: string[]
    escapeStyle?: boolean
    escapeScript?: boolean
}>

interface DerivedFunc {
    <T>(expression: NotFunction<T>): T
    <T>(getter: () => T): T
}

interface ReloadedGetKVPair {
    <T>(_: Set<T>): [T, T]
    <K, V>(_: Map<K, V>): [V, K]
    <T>(_: Array<T>): [T, number]
    (_: number): [number, number]
    (_: string): [string, number]
    <K extends string | number | symbol, V>(_: Record<K, V>): [V, K]
}

interface WatchFunc {
    <T>(
        expression: NotFunction<T>,
        callback: (pre: NotFunction<T>, cur: NotFunction<T>) => void
    ): (fn?: GeneralFunc) => void
    <T>(getter: () => T, callback: (pre: T, cur: T) => void): (fn?: GeneralFunc) => void
}

export namespace __c__ {
    type EmptyObject = {
        [symbol]?: never
    }

    var Receiver: any
    const symbol: unique symbol

    const GetKVPair: ReloadedGetKVPair
    const GetTypedValue: <T>() => T
    const GetResolve: <T>(_: T) => ExtractResolveType<T>
    const GetEventHandler: <T>(_: T) => ExtractEventHandlerKind<typeof _>
    const GetSlotProp: <T extends Constructible, K extends ExtractSlotNames<T>>(
        _: T,
        __: K
    ) => Readonly<ConstructorParameters<T>[2][K]>

    const SatisfyString: (_: string) => void
    const SatisfyBoolean: (_: boolean) => void
    const SatisfyPromise: (_: Promise<any>) => void
    const SatisfyHtmlDirective: (_?: UnescapeOptions) => void
    const SatisfyElement: <K>(_: ExtractElementKind<K>) => void
    const SatisfyTargetDirective: (_: HTMLElement | string) => void
    const SatisfyRefGroup: <T>(_: Set<T> | Array<T>, __: T) => void
    const SatisfyEventHandler: <K>(_: (_: ExtractEventHandlerKind<K>) => void) => void

    const SatisfyComponent: <T extends Constructible>(
        _: T,
        __: ConstructorParameters<T>[0],
        ___: ConstructorParameters<T>[1]
    ) => void
}

export const wat: WatchFunc
export const waT: WatchFunc
export const Wat: WatchFunc
export const der: DerivedFunc
export function stc<T = undefined>(value: T): T
export function rea<T = undefined>(value: T, level?: number): T
