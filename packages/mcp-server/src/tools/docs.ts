import type { DocEntry } from "../types"
import type { McpServer } from "@modelcontextprotocol/server"

import {
    QUERY_EXPANSION_MAP,
    BOOTSTRAP_TOOL_DESCRIPTION,
    SEARCH_DOCS_TOOL_DESCRIPTION
} from "../constants"
import { z } from "zod"

export function registerDocTools(server: McpServer, docs: DocEntry[]) {
    server.registerTool(
        "get_qingkuai_project_bootstrap_guide",
        {
            inputSchema: z.object({
                limit: z
                    .number()
                    .int()
                    .min(1)
                    .max(8)
                    .optional()
                    .describe("Maximum number of results. Default is 4."),
                query: z
                    .string()
                    .optional()
                    .describe("Optional keywords. Default: getting started installation create.")
            }),
            description: BOOTSTRAP_TOOL_DESCRIPTION,
            title: "Get Qingkuai Project Bootstrap Guide"
        },
        async ({ query, limit }) => {
            const maxResults = limit ?? 4
            const normalizedQuery = normalizeText(
                query?.trim() || "getting started installation create scaffold"
            )
            const targets = rankDocs(docs, normalizedQuery, maxResults, doc => {
                return /getting-started\/installation\.md$/.test(doc.uri) ? 50 : 0
            })

            if (!targets.length) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "No Qingkuai bootstrap docs found."
                        }
                    ]
                }
            }

            const structuredContent = {
                task: "qingkuai-project-bootstrap",
                results: mapRankedResults(targets, 260)
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
            const ranked = rankDocs(docs, normalizedQuery, maxResults)
            const results = mapRankedResults(ranked, 220)

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

type RankedDoc = {
    doc: DocEntry
    score: number
}

function rankDocs(
    docs: DocEntry[],
    normalizedQuery: string,
    maxResults: number,
    scoreBoost?: (doc: DocEntry) => number
) {
    const keywords = buildSearchKeywords(normalizedQuery)

    return docs
        .map<RankedDoc>(doc => {
            const baseBoost = scoreBoost ? scoreBoost(doc) : 0
            const score = baseBoost + scoreDoc(doc, normalizedQuery, keywords)
            return { doc, score }
        })
        .filter(item => item.score > 0)
        .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score
            }
            return a.doc.name.localeCompare(b.doc.name)
        })
        .slice(0, maxResults)
}

function mapRankedResults(items: RankedDoc[], previewLength: number) {
    return items.map(item => {
        const preview = item.doc.content.replace(/\s+/g, " ").slice(0, previewLength)
        return {
            preview,
            score: item.score,
            uri: item.doc.uri,
            name: item.doc.name,
            description: item.doc.description
        }
    })
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
