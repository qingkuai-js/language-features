import type { LSMessage } from "../types/service"

export const ExternalGlobalTypeWithGenerics = (): LSMessage => {
    return [
        3001,
        `The external type with generics cannot be used as the global type.`,
        "https://qingkuai.dev/misc/typescript.html#generics"
    ]
}

export const GlobalTypeIsNonObjectTs = (name: string): LSMessage => {
    return [
        3002,
        `The global type "${name}" must satisfy the constraint of being an object type.`,
        "https://qingkuai.dev/misc/typescript.html#component-attribute-types"
    ]
}

export const QingkuaiNotFound = (): LSMessage => {
    return [
        3003,
        `The dependency "qingkuai" cannot be found. Please make sure it is installed and can be resolved.`
    ]
}
