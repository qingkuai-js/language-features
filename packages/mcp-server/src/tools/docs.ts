import type { DocEntry, DocSection } from "../types"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import {
    buildDocIndex,
    searchDocIndex,
    slugifyHeading,
    extractDocLinks,
    extractDocTitle,
    parseDocSections
} from "../doc-index"
import {
    BOOTSTRAP_TOOL_DESCRIPTION,
    READ_DOC_TOOL_DESCRIPTION,
    SEARCH_DOCS_TOOL_DESCRIPTION
} from "../constants"
import { z } from "zod"

const READ_FULL_MAX_CHARS = 8 * 1024
const SEARCH_SECTION_MAX_CHARS = 3 * 1024
const SEARCH_GUIDANCE =
    "Base your answer on the matchedSections above (authoritative Qingkuai docs). Follow relatedDocs for cross-referenced syntax. Use read_qingkuai_doc with the returned URIs for full documents. After writing .qk code, verify it with check_qingkuai_syntax."

export function registerDocTools(server: McpServer, docs: DocEntry[]) {
    const index = buildDocIndex(docs)
    const entriesByUri = new Map(docs.map(doc => [doc.uri, doc]))

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
            const normalizedQuery = query?.trim() || "getting started installation create scaffold"
            const { groups, fuzzy } = searchDocIndex(index, normalizedQuery, {
                limit: limit ?? 4,
                scoreBoost: doc => {
                    return doc.canonicalUri === "docs://getting-started/install.md" ? 50 : 0
                }
            })

            if (!groups.length) {
                return textResult("No Qingkuai bootstrap docs found.")
            }

            const structuredContent = {
                task: "qingkuai-project-bootstrap",
                fuzzy,
                guidance: SEARCH_GUIDANCE,
                results: mapGroups(groups, entriesByUri)
            }
            return jsonResult(structuredContent)
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
                    .describe("Maximum number of result groups. Default is 4."),
                query: z
                    .string()
                    .min(1)
                    .describe(
                        "Keywords, a natural-language question (English or Chinese), or syntax tokens like #for / &value / qk:spread."
                    )
            }),
            title: "Search Qingkuai Syntax Docs",
            description: SEARCH_DOCS_TOOL_DESCRIPTION
        },
        async ({ query, limit }) => {
            const { groups, fuzzy } = searchDocIndex(index, query, {
                limit: limit ?? 4
            })
            if (!groups.length) {
                return textResult(`No Qingkuai docs matched query: ${query}`)
            }

            const structuredContent = {
                query,
                fuzzy,
                fuzzyHint: fuzzy
                    ? "No exact match. These are the closest candidates; try English syntax tokens (e.g. #for, &value) or key nouns."
                    : undefined,
                results: mapGroups(groups, entriesByUri),
                guidance: SEARCH_GUIDANCE
            }
            return jsonResult(structuredContent)
        }
    )

    server.registerTool(
        "read_qingkuai_doc",
        {
            inputSchema: z.object({
                uri: z
                    .string()
                    .min(1)
                    .describe(
                        "Doc URI returned by search_qingkuai_docs, e.g. docs://basic/forms.md or docs://basic/forms.md#two-way-binding"
                    )
            }),
            title: "Read Qingkuai Doc",
            description: READ_DOC_TOOL_DESCRIPTION
        },
        async ({ uri }) => {
            const { targetUri, anchor } = splitDocUri(uri)
            const entry = entriesByUri.get(targetUri) ?? entriesByUri.get(`docs://${targetUri}`)

            if (!entry) {
                return textResult(
                    `Unknown doc URI: ${uri}\nClosest valid URIs:\n${suggestUris(
                        entriesByUri,
                        targetUri
                    )}`
                )
            }

            if (anchor) {
                // 锚点为 H1 标题 slug 时指向文档开头，返回全文
                const h1Slug = slugifyHeading(extractDocTitle(entry.content) ?? "")
                if (anchor !== h1Slug) {
                    const section = findSection(entry, anchor)
                    if (!section) {
                        return textResult(
                            `Anchor "#${anchor}" not found in ${entry.uri}. Available sections:\n${listAnchors(
                                entry
                            )}`
                        )
                    }
                    const structuredContent = {
                        uri: `${entry.uri}#${section.anchor}`,
                        title: section.title,
                        content: truncate(section.content, READ_FULL_MAX_CHARS),
                        relatedDocs: extractDocLinks(entry.content).slice(0, 5)
                    }
                    return jsonResult(structuredContent)
                }
            }

            const structuredContent = {
                uri: entry.uri,
                description: entry.description,
                content: truncate(entry.content, READ_FULL_MAX_CHARS),
                relatedDocs: extractDocLinks(entry.content).slice(0, 5)
            }
            return jsonResult(structuredContent)
        }
    )
}

function mapGroups(
    groups: ReturnType<typeof searchDocIndex>["groups"],
    entriesByUri: Map<string, DocEntry>
) {
    return groups.map(group => {
        const entry = entriesByUri.get(group.doc.uri)
        const relatedDocs = entry ? extractDocLinks(entry.content).slice(0, 5) : []
        return {
            uri: group.doc.canonicalUri,
            zhUri: group.doc.zhUri,
            name: group.doc.name,
            description: group.doc.description,
            layer: group.doc.layer,
            matchedSections: group.sections.map(ranked => ({
                uri:
                    ranked.section.anchor.length > 0
                        ? `${ranked.section.doc.uri}#${ranked.section.anchor}`
                        : ranked.section.doc.uri,
                anchor: ranked.section.anchor,
                title: ranked.section.title,
                score: Math.round(ranked.score * 100) / 100,
                snippet: ranked.snippet,
                content: truncate(ranked.section.content, SEARCH_SECTION_MAX_CHARS)
            })),
            relatedDocs
        }
    })
}

function findSection(entry: DocEntry, anchor: string): DocSection | undefined {
    return parseSectionsOf(entry).find(
        section =>
            section.anchor === anchor || section.anchor.toLowerCase() === anchor.toLowerCase()
    )
}

function listAnchors(entry: DocEntry): string {
    return parseSectionsOf(entry)
        .filter(section => section.anchor.length > 0)
        .map(section => `- ${entry.uri}#${section.anchor}`)
        .join("\n")
}

function parseSectionsOf(entry: DocEntry): DocSection[] {
    const stub = {
        uri: entry.uri,
        name: entry.name,
        canonicalUri: entry.uri,
        description: entry.description,
        keywords: entry.keywords,
        lang: entry.lang,
        layer: entry.layer
    }
    return parseDocSections(stub, entry.content, extractDocTitle(entry.content) ?? entry.name)
}

function splitDocUri(input: string): { targetUri: string; anchor: string } {
    let value = input.trim()
    const hashIndex = value.indexOf("#")
    let anchor = ""
    if (hashIndex !== -1) {
        anchor = decodeURIComponent(value.slice(hashIndex + 1))
        value = value.slice(0, hashIndex)
    }
    return { targetUri: value, anchor }
}

function suggestUris(entriesByUri: Map<string, DocEntry>, targetUri: string): string {
    const fragment = targetUri
        .replace(/^docs:\/\//, "")
        .split("/")
        .pop()!
        .replace(/\.md$/, "")
        .toLowerCase()
    const candidates = Array.from(entriesByUri.keys()).filter(uri =>
        uri.toLowerCase().includes(fragment)
    )
    const pool = candidates.length > 0 ? candidates : Array.from(entriesByUri.keys())
    return pool
        .slice(0, 5)
        .map(candidate => `- ${candidate}`)
        .join("\n")
}

function truncate(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
        return text
    }
    return (
        text.slice(0, maxChars) +
        `\n\n…[truncated: ${text.length} chars total; read a specific #section for targeted content]`
    )
}

function jsonResult(payload: Record<string, unknown>) {
    return {
        content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload
    }
}

function textResult(text: string) {
    return {
        content: [{ type: "text" as const, text }]
    }
}
