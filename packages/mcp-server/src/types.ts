export type DocLang = "en" | "zh-cn"

/** 从 docs:// URI 解析出的语言与规范 URI */
export type DocInfo = {
    lang: DocLang
    canonicalUri: string
}

export type DocEntry = {
    name: string
    uri: string
    content: string
    description: string
    keywords: string[]
    lang: DocLang
}

export type DocSection = {
    /** 所属文档 */
    docUri: string
    docName: string
    /** 章节锚点，与 markdown 标题 slug 一致 */
    anchor: string
    title: string
    content: string
    lang: DocLang
}

export type IndexedDoc = {
    uri: string
    /** en/zh 同一主题文档合并分组用的规范 URI（zh-cn 归并到 en 路径） */
    canonicalUri: string
    zhUri?: string
    enUri?: string
    name: string
    description: string
    keywords: string[]
    lang: DocLang
}

export type IndexedSection = {
    doc: IndexedDoc
    anchor: string
    title: string
    content: string
    lowerTitle: string
    lowerContent: string
}

export type RankedSection = {
    section: IndexedSection
    score: number
    snippet: string
}

export type RankedGroup = {
    doc: IndexedDoc
    score: number
    sections: RankedSection[]
}

export type SectionGroup = {
    doc: IndexedDoc
    sections: RankedSection[]
}

export type DocIndex = {
    docs: IndexedDoc[]
    sections: IndexedSection[]
}

export type SearchOptions = {
    limit?: number
    maxSectionsPerDoc?: number
    scoreBoost?: (doc: IndexedDoc) => number
}

export type SearchResult = {
    groups: RankedGroup[]
    /** true 表示零强命中，返回的是宽松兜底候选 */
    fuzzy: boolean
}

/** 解析后的查询：normalized 供精确短语与路由匹配，tokens 为英文/语法词元，cjkRuns 为中文串（整串强匹配 + bigram 弱匹配） */
export type ParsedQuery = {
    normalized: string
    tokens: string[]
    cjkRuns: string[]
}

export type DocUriParts = {
    targetUri: string
    anchor: string
}

export type TaskRoute = {
    patterns: string[]
    paths: string[]
}
