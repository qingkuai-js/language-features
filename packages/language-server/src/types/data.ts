export interface HTMLElementData {
    tags: HTMLElementDataTagItem[]
    valueSets: {
        name: string
        values: {
            name: string
            description?: HTMLElementDataDescription
        }[]
    }[]
    globalAttributes: HTMLElementDataAttributeItem[]
}

export interface HTMLElementDataAttributeItem {
    name: string
    valueSet?: string
    references?: {
        name: string
        url: string
    }[]
    description?: HTMLElementDataDescription
}

export interface HTMLElementDataTagItem {
    name: string
    void?: boolean
    references: {
        name: string
        url: string
    }[]
    description: HTMLElementDataDescription
    attributes: HTMLElementDataAttributeItem[]
}

export type HTMLElementDataDescription = string | { kind: "markdown"; value: string }
