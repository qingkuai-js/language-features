import type { LSMessage } from "../types/service"

export const MetaOrMemberNonObjectTs = (name?: string): LSMessage => {
    const desc = "Meta" + (name ? ` member "${name}"` : "")
    return [
        3002,
        `The ${desc} must satisfy the constraint of being an object type.`,
        "https://qingkuai.dev/misc/typescript.html#component-contract-types"
    ]
}

export const QingkuaiNotFound = (): LSMessage => {
    return [
        3003,
        `The dependency "qingkuai" cannot be found. Please make sure it is installed and can be resolved.`
    ]
}

export const TypeExportNotAllowed = (name: string): LSMessage => {
    return [
        3005,
        `The type "${name}" cannot be exported from a component. Move the type to an external ".ts" file and import it.`,
        "https://qingkuai.dev/components/exports.html#syntax-limitations"
    ]
}

export const UnknownMetaMember = (name: string): LSMessage => {
    return [
        3001,
        `The component contract "Meta" declares an unknown member "${name}". Only "props", "refs", and "contexts" are allowed.`,
        "https://qingkuai.dev/misc/typescript.html#component-contract-types"
    ]
}

export const BadExternalMetaType = (name: string): LSMessage => {
    return [
        3004,
        `The externally imported type "${name}" cannot be used directly as the component contract "Meta" because it contains generic parameters. You can declare "Meta" in this component file by wrapping this type, or use a non-generic external type instead.`,
        "https://qingkuai.dev/misc/typescript.html#generic-parameters"
    ]
}
