import type { LSMessage } from "../types/service"

export const MetaOrMemberNonObjectJs = (name?: string): LSMessage => {
    const desc = "Meta" + (name ? ` member "${name}"` : "")
    return [
        7001,
        `The ${desc} must satisfy the constraint of being an object type.`,
        "https://qingkuai.dev/misc/typescript.html#component-contract-types"
    ]
}

export const KeyframeWillNotBeScoped = (): LSMessage => {
    return [
        7002,
        "The @keyframes rule is not scoped. It is recommended to define it in an external stylesheet and import it from the application entry file."
    ]
}
