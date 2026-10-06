import type {
    DocEntry,
    DocIndex,
    DocInfo,
    DocLang,
    DocLayer,
    DocSection,
    IndexedDoc,
    ParsedQuery,
    SearchResult,
    RankedSection,
    SectionGroup,
    SearchOptions,
    IndexedSection
} from "./types"

import { QUERY_EXPANSION_MAP, TASK_ROUTE_BOOST, TASK_ROUTES } from "./constants"

const FENCE_RE = /^\s*(```|~~~)/
const CJK_RUN_RE = /[\u4e00-\u9fff]{2,}/g
const HEADING_RE = /^(#{2,3})\s+(.+?)\s*$/
const LATIN_TOKEN_RE = /[#&!@$]?[a-zA-Z][a-zA-Z0-9:_-]*/g

/** 兜底候选数量 */
const FUZZY_LIMIT = 3

/** 单节内单个词条按出现次数计分的上限 */
const MAX_SCORED_OCCURRENCES = 4

/** 单节内 CJK bigram 计分条数上限，防止长中文串刷分 */
const MAX_SCORED_BIGRAMS = 8

/** agent 层平铺加权：平手时偏向结构化参考，但翻不过内容丰富度差距与路由加权 */
const AGENT_LAYER_BOOST = 15

export function docInfoFromUri(relativePath: string): DocInfo {
    let lang: DocLang = "en"
    let layer: DocLayer = "tutorial"
    let canonical = relativePath

    if (relativePath.startsWith("zh-cn/")) {
        lang = "zh-cn"
        canonical = relativePath.slice("zh-cn/".length)
    }

    // agent 参考层双语（agent/ 与 zh-cn/agent/）：canonical 去掉语言前缀后与英文层同组归并
    if (canonical.startsWith("agent/")) {
        layer = "agent"
    }

    return { lang, layer, canonicalUri: `docs://${canonical}` }
}

/** 与 GitHub 风格一致的标题 slug：小写、去标点、空白转连字符，保留 CJK */
export function slugifyHeading(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
        .replace(/\s+/g, "-")
}

export function extractDocLinks(content: string): string[] {
    const links: string[] = []
    const re = /\((docs:\/\/[^)\s]+)\)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(content))) {
        if (!links.includes(m[1])) {
            links.push(m[1])
        }
    }
    return links
}

/** 提取文档 H1 标题；无 H1 时返回 null */
export function extractDocTitle(content: string): string | null {
    const m = /^#\s+(.+)$/m.exec(content)
    return m ? m[1].trim() : null
}

/** 按 H2/H3 标题切片（跳过代码块内的 # 行）；首段（第一个 H2 之前）作为 anchor 为空的前言节 */
export function parseDocSections(doc: IndexedDoc, content: string, docTitle: string): DocSection[] {
    const sections: DocSection[] = []
    let currentTitle = docTitle
    let currentAnchor = ""
    let buffer: string[] = []
    let inFence = false

    const flush = () => {
        const text = buffer.join("\n").trim()
        if (text) {
            sections.push({
                docUri: doc.uri,
                docName: doc.name,
                anchor: currentAnchor,
                title: currentTitle,
                content: text,
                lang: doc.lang,
                layer: doc.layer
            })
        }
        buffer = []
    }

    for (const line of content.split("\n")) {
        if (FENCE_RE.test(line)) {
            inFence = !inFence
            buffer.push(line)
            continue
        }
        const heading = inFence ? null : HEADING_RE.exec(line)
        if (heading) {
            flush()
            currentTitle = heading[2]
            currentAnchor = slugifyHeading(heading[2])
            continue
        }
        buffer.push(line)
    }
    flush()

    return sections
}

export function buildDocIndex(docs: DocEntry[]): DocIndex {
    const docMap = new Map<string, IndexedDoc>()

    const indexedDocs: IndexedDoc[] = docs.map(doc => {
        const info = docInfoFromUri(doc.uri.slice("docs://".length))
        const indexed: IndexedDoc = {
            uri: doc.uri,
            canonicalUri: info.canonicalUri,
            name: doc.name,
            description: doc.description,
            keywords: doc.keywords,
            lang: info.lang,
            layer: info.layer
        }
        docMap.set(doc.uri, indexed)
        return indexed
    })

    // en/zh 同主题互挂 zhUri/enUri，供搜索结果合并展示
    for (const doc of indexedDocs) {
        const canonicalKey = doc.canonicalUri
        const isZh = doc.lang === "zh-cn"
        const counterpart = indexedDocs.find(
            d => d.canonicalUri === canonicalKey && d.lang !== doc.lang
        )
        if (isZh) {
            doc.zhUri = doc.uri
            if (counterpart) {
                doc.enUri = counterpart.uri
            }
        } else if (counterpart) {
            doc.zhUri = counterpart.uri
        }
    }

    // agent 层文档继承同主题教程层的 zh-cn 阅读路径（agent 参考层仅英文）
    for (const doc of indexedDocs) {
        if (doc.layer !== "agent" || doc.zhUri) {
            continue
        }
        const tutorialPath = doc.canonicalUri.replace("docs://agent/", "docs://")
        const tutorialEn = indexedDocs.find(d => d.canonicalUri === tutorialPath)
        if (tutorialEn) {
            doc.enUri = tutorialEn.uri
            doc.zhUri = tutorialEn.zhUri
        }
    }

    const sections: IndexedSection[] = []
    for (const doc of indexedDocs) {
        const entry = docs.find(d => d.uri === doc.uri)!
        const docTitle = extractDocTitle(entry.content) ?? doc.name
        for (const section of parseDocSections(doc, entry.content, docTitle)) {
            sections.push({
                ...section,
                doc,
                lowerTitle: section.title.toLowerCase(),
                lowerContent: section.content.toLowerCase()
            })
        }
    }

    return { docs: indexedDocs, sections }
}

export function parseQuery(rawQuery: string): ParsedQuery {
    const normalized = rawQuery.toLowerCase().trim()
    const tokens = new Set<string>()
    const runs = new Set<string>()

    for (const m of rawQuery.match(LATIN_TOKEN_RE) ?? []) {
        const t = m.toLowerCase()
        if (t.length >= 1 && t !== "qk") {
            tokens.add(t)
        }
    }
    for (const m of rawQuery.match(CJK_RUN_RE) ?? []) {
        runs.add(m)
    }
    for (const [key, values] of Object.entries(QUERY_EXPANSION_MAP)) {
        if (!normalized.includes(key)) {
            continue
        }
        for (const value of values) {
            if (/[\u4e00-\u9fff]/.test(value)) {
                for (const m of value.match(CJK_RUN_RE) ?? []) {
                    runs.add(m)
                }
            } else {
                tokens.add(value.toLowerCase())
            }
        }
    }

    return { normalized, tokens: Array.from(tokens), cjkRuns: Array.from(runs) }
}

function bigrams(run: string): string[] {
    const result: string[] = []
    for (let i = 0; i < run.length - 1; i++) {
        result.push(run.slice(i, i + 2))
    }
    return result.slice(0, MAX_SCORED_BIGRAMS)
}

export function searchDocIndex(
    index: DocIndex,
    rawQuery: string,
    options: SearchOptions = {}
): SearchResult {
    const { limit = 4, maxSectionsPerDoc = 2, scoreBoost } = options
    const query = parseQuery(rawQuery)
    const total = index.sections.length

    // 惰性文档频率：仅在查询词出现的章节上统计
    const dfCache = new Map<string, number>()
    const df = (term: string) => {
        let count = dfCache.get(term)
        if (count === undefined) {
            count = index.sections.filter(
                s => s.lowerContent.includes(term) || s.lowerTitle.includes(term)
            ).length
            dfCache.set(term, count)
        }
        return count
    }
    const idf = (term: string) => (df(term) > 0 ? Math.log(1 + total / (df(term) + 1)) : 0)

    const scored = new Map<IndexedSection, number>()

    const addScore = (section: IndexedSection, delta: number) => {
        scored.set(section, (scored.get(section) ?? 0) + delta)
    }

    const scoreTerm = (term: string, weight: number) => {
        const weightWithIdf = weight * idf(term)
        if (weightWithIdf <= 0) {
            return
        }
        for (const section of index.sections) {
            if (section.lowerTitle.includes(term)) {
                addScore(section, weightWithIdf * 1.5)
            }
            // 按出现次数计分（封顶），专题文档比顺带提及的文档更相关
            const occurrences = section.lowerContent.split(term).length - 1
            if (occurrences > 0) {
                addScore(section, weightWithIdf * Math.min(occurrences, MAX_SCORED_OCCURRENCES))
            }
        }
    }

    for (const token of query.tokens) {
        scoreTerm(token, 2)
    }
    for (const run of query.cjkRuns) {
        // 整串命中是强信号；bigram 覆盖查询带多余修饰词的情况
        for (const section of index.sections) {
            if (section.lowerContent.includes(run) || section.lowerTitle.includes(run)) {
                addScore(section, 5 * Math.log(1 + total / (df(run) + 1)) + 1)
            }
        }
        for (const gram of bigrams(run)) {
            scoreTerm(gram, 0.8)
        }
    }

    // 整个查询作为精确短语命中时给强加分
    if (query.normalized.length > 1) {
        for (const section of index.sections) {
            if (section.lowerTitle.includes(query.normalized)) {
                addScore(section, 15)
            }
            if (section.lowerContent.includes(query.normalized)) {
                addScore(section, 8)
            }
        }
    }

    // 分组：同一 canonical 文档（en+zh）合并，agent 层独立成组
    const groupMap = new Map<string, SectionGroup>()

    const rankedSections = Array.from(scored.entries())
        .filter(([, score]) => score >= 1)
        .map(([section, score]) => ({ section, score, snippet: "" }) as RankedSection)
        .sort((a, b) => b.score - a.score)

    for (const ranked of rankedSections) {
        ranked.snippet = extractSnippet(ranked.section, query)
        const key = ranked.section.doc.canonicalUri
        let group = groupMap.get(key)
        if (!group) {
            group = { doc: ranked.section.doc, sections: [] }
            groupMap.set(key, group)
        }
        if (group.sections.length < maxSectionsPerDoc) {
            group.sections.push(ranked)
        }
    }

    const groups = Array.from(groupMap.values())
        .map(group => {
            const best = group.sections[0]?.score ?? 0
            const docLevel = scoreDocLevel(group.doc, query)
            const boost =
                (group.doc.layer === "agent" ? AGENT_LAYER_BOOST : 0) +
                routeBoost(group.doc, query) +
                (scoreBoost ? scoreBoost(group.doc) : 0)
            return { ...group, score: best + docLevel + boost }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

    if (groups.length > 0) {
        return { groups, fuzzy: false }
    }

    // 兜底：任何 token/关键词层面沾边的文档取前几个，并标记为宽松结果
    const fuzzyPool = new Map<IndexedSection, number>()
    for (const section of index.sections) {
        let hit = 0
        for (const token of query.tokens) {
            if (section.lowerContent.includes(token)) {
                hit++
            }
        }
        for (const run of query.cjkRuns) {
            for (const gram of bigrams(run)) {
                if (section.lowerContent.includes(gram)) {
                    hit++
                }
            }
        }
        if (hit > 0) {
            fuzzyPool.set(section, hit)
        }
    }
    const fuzzyGroups = new Map<string, SectionGroup>()
    for (const [section, hit] of Array.from(fuzzyPool.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, FUZZY_LIMIT * 2)) {
        const key = section.doc.canonicalUri
        let group = fuzzyGroups.get(key)
        if (!group) {
            group = { doc: section.doc, sections: [] }
            fuzzyGroups.set(key, group)
        }
        if (group.sections.length < 1) {
            group.sections.push({
                section,
                score: hit,
                snippet: extractSnippet(section, query)
            })
        }
    }
    return {
        groups: Array.from(fuzzyGroups.values())
            .map(group => ({ ...group, score: 0 }))
            .slice(0, FUZZY_LIMIT),
        fuzzy: true
    }

    function scoreDocLevel(doc: IndexedDoc, q: ParsedQuery) {
        const name = doc.name.toLowerCase()
        const keywords = doc.keywords.join(" ").toLowerCase()
        const description = doc.description.toLowerCase()
        let score = 0
        for (const token of q.tokens) {
            if (name.includes(token)) {
                score += 6
            }
            if (keywords.includes(token)) {
                score += 4
            }
            if (description.includes(token)) {
                score += 2
            }
        }
        for (const run of q.cjkRuns) {
            if (keywords.includes(run) || name.includes(run)) {
                score += 8
            }
            if (description.includes(run)) {
                score += 4
            }
        }
        if (q.normalized.length > 1 && name.includes(q.normalized)) {
            score += 15
        }
        return score
    }

    /** 查询命中任务路由时，给路由指向的文档（各语言/层次变体）加权 */
    function routeBoost(doc: IndexedDoc, q: ParsedQuery) {
        let boost = 0
        for (const route of TASK_ROUTES) {
            if (!route.patterns.some(pattern => q.normalized.includes(pattern.toLowerCase()))) {
                continue
            }
            if (route.paths.some(path => doc.canonicalUri.endsWith(path))) {
                boost += TASK_ROUTE_BOOST
            }
        }
        return boost
    }
}

/** 定位首个命中位置，取前后约 80 字符窗口并加粗命中词；最多返回 2 个不重叠片段 */
export function extractSnippet(section: IndexedSection, query: ParsedQuery): string {
    const width = 80
    const flattened = section.content.replace(/\s+/g, " ")
    const lower = flattened.toLowerCase()

    const terms: string[] = []
    for (const token of query.tokens) {
        if (token.length >= 2 && lower.includes(token)) {
            terms.push(token)
        }
    }
    for (const run of query.cjkRuns) {
        if (lower.includes(run)) {
            terms.push(run)
        }
    }
    if (terms.length === 0) {
        // 仅 title/keywords 命中时回退到章节开头
        return flattenWithBold(flattened.slice(0, width * 1.5), [])
    }

    const windows: Array<[number, number]> = []
    for (const term of terms) {
        const pos = lower.indexOf(term)
        if (pos === -1) {
            continue
        }
        const start = Math.max(0, pos - width)
        const end = Math.min(flattened.length, pos + term.length + width)
        if (windows.some(([ws, we]) => start < we && end > ws)) {
            continue
        }
        windows.push([start, end])
        if (windows.length >= 2) {
            break
        }
    }

    return windows
        .map(([start, end]) => {
            const prefix = start > 0 ? "…" : ""
            const suffix = end < flattened.length ? "…" : ""
            return prefix + flattenWithBold(flattened.slice(start, end), terms) + suffix
        })
        .join("  ")
}

function flattenWithBold(text: string, terms: string[]): string {
    if (terms.length === 0) {
        return text
    }
    const alternation = terms
        .map(escapeRegExp)
        .sort((a, b) => b.length - a.length)
        .join("|")
    return text.replace(new RegExp(`(${alternation})`, "gi"), "**$1**")
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
