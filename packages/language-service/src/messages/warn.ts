import type { LSMessage } from "../types/service"

export const GlobalTypeIsNonObjectJs = (name: string): LSMessage => {
    return [
        7001,
        `The global type "${name}" must satisfy the constraint of being an object type.`,
        "https://qingkuai.dev/misc/typescript.html#component-attribute-types"
    ]
}
