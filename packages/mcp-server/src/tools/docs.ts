import type { DocEntry } from "../types"
import type { McpServer } from "@modelcontextprotocol/server"

import { z } from "zod"

import { SEARCH_DOCS_TOOL_DESCRIPTION } from "../constants"

export function registerDocTools(server: McpServer, docs: DocEntry[]) {
    server.registerTool(
        "search_qingkuai_docs",
        {
            inputSchema: z.object({
                limit: z
                    .number()
                    .int()
                    .min(1)
                    .max(8)
                    .optional()
                    .describe("Maximum number of results. Default is 4."),
                query: z.string().min(1).describe("Keywords to search in Qingkuai docs.")
            }),
            title: "Search Qingkuai Syntax Docs",
            description: SEARCH_DOCS_TOOL_DESCRIPTION
        },
        async ({ query, limit }) => {
            const maxResults = limit ?? 4
            const normalizedQuery = normalizeText(query)
            const keywords = buildSearchKeywords(normalizedQuery)

            const rankedWithScores = docs.map(doc => {
                const score = scoreDoc(doc, normalizedQuery, keywords)
                return { doc, score }
            })

            const matchedRanked = rankedWithScores.filter(item => {
                return item.score > 0
            })
            const sortedRanked = matchedRanked.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score
                }
                return a.doc.name.localeCompare(b.doc.name)
            })
            const ranked = sortedRanked.slice(0, maxResults)

            const results = ranked.map(item => {
                const normalizedContent = item.doc.content.replace(/\s+/g, " ")
                const preview = normalizedContent.slice(0, 220)
                return {
                    preview,
                    score: item.score,
                    uri: item.doc.uri,
                    name: item.doc.name,
                    description: item.doc.description
                }
            })

            const structuredContent = {
                query,
                results
            }
            if (!results.length) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `No Qingkuai docs matched query: ${query}`
                        }
                    ]
                }
            }
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(structuredContent, null, 2)
                    }
                ],
                structuredContent
            }
        }
    )
}

function scoreDoc(doc: DocEntry, normalizedQuery: string, keywords: string[]) {
    let score = 0
    const name = normalizeText(doc.name)
    const description = normalizeText(doc.description)
    const uri = normalizeText(doc.uri)
    const content = normalizeText(doc.content)

    if (normalizedQuery.length > 1) {
        if (name.includes(normalizedQuery)) {
            score += 30
        }
        if (uri.includes(normalizedQuery)) {
            score += 24
        }
        if (description.includes(normalizedQuery)) {
            score += 16
        }
        if (content.includes(normalizedQuery)) {
            score += 6
        }
    }

    for (const keyword of keywords) {
        if (name.includes(keyword)) {
            score += 12
        }
        if (uri.includes(keyword)) {
            score += 10
        }
        if (description.includes(keyword)) {
            score += 6
        }
        if (content.includes(keyword)) {
            score += 2
        }
    }

    return score
}

function normalizeText(text: string) {
    return text.toLowerCase().trim()
}

function buildSearchKeywords(query: string) {
    const rawTokens = query.split(/[\s,，。！？;；:：/\\|()\[\]{}<>"'`]+/)
    const baseTokens = rawTokens.map(t => t.trim()).filter(Boolean)
    const tokens = new Set(baseTokens)

    for (const [k, values] of Object.entries(QUERY_EXPANSION_MAP)) {
        if (query.includes(k)) {
            for (const value of values) {
                tokens.add(value)
            }
        }
    }

    return Array.from(tokens).filter(token => token.length > 1)
}

const QUERY_EXPANSION_MAP: Record<string, string[]> = {
    安装: ["installation", "install", "getting-started"],
    初始化: ["installation", "create", "project", "getting-started"],
    创建项目: ["create", "project", "installation", "getting-started"],
    脚手架: ["create", "project", "installation"],
    语法: ["syntax", "grammar", "basic"],
    指令: ["directive", "directives"],
    引用属性: ["reference", "attributes", "forms"],
    双向绑定: ["reference", "attributes", "forms", "value", "checked"],
    表单: ["forms", "input", "checked", "value"],
    响应式: ["reactivity", "derived", "reactive", "shallow", "raw"],
    组件: ["components", "component"],
    配置: ["config", "configuration", "qingkuairc", "prettierrc"],
    格式化: ["format", "prettier", "config"],
    编译: ["compile", "compiler", "reactivity"],
    悬停: ["hover", "reactivity", "inferred"],
    事件: ["event", "events"],
    属性: ["attributes", "props"],
    官网: ["getting-started", "installation"]
}
