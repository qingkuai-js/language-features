export interface HTMLData {
    tags: HTMLDataTagItem[]
    valueSets: {
        name: string
        values: {
            name: string
            description?: HTMLDataDescription
        }[]
    }[]
    globalAttributes: HTMLDataAttributeItem[]
}

export interface HTMLDataAttributeItem {
    name: string
    valueSet?: string
    references?: {
        name: string
        url: string
    }[]
    description?: HTMLDataDescription
}

export interface HTMLDataTagItem {
    name: string
    void?: boolean
    references: {
        name: string
        url: string
    }[]
    description: HTMLDataDescription
    attributes: HTMLDataAttributeItem[]
}

export type HTMLDataDescription = string | { kind: "markdown"; value: string }
