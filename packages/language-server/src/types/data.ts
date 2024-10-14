export interface HTMLData {
    tags: HTMLDataTagItem[]
    valueSets: {
        name: string
        values: HTMLDataValueSetValueItem[]
    }[]
    globalAttributes: HTMLDataGlobalAttributeItem[]
}

export interface HTMLDataAttributeItem {
    name: string
    valueSet?: string
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

export interface HTMLDataValueSetValueItem {
    name: string
    description?: HTMLDataDescription
}

export type HTMLDataGlobalAttributeItem = HTMLDataAttributeItem & {
    references?: {
        name: string
        url: string
    }[]
}

export type HTMLDataDescription = string | { kind: "markdown"; value: string }
