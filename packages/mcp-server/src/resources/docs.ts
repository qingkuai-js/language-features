import type { DocEntry } from "../types"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import nodeFs from "node:fs"
import nodePath from "node:path"

import { resolveResourceDir } from "../utils"
import { util as qingkuaiUtil } from "qingkuai/compiler"
import { docInfoFromUri, parseDocSections } from "../doc-index"
import { mdMetaDataLineRE, mdMetaDataRE } from "../regular"

export function loadDocResources(server: McpServer) {
    const docs = loadDocEntries()
    const docsDir = resolveResourceDir("docs")

    for (const doc of docs) {
        const filePath = nodePath.join(docsDir, doc.uri.slice("docs://".length))
        const parseResult = parseDocContent(nodeFs.readFileSync(filePath, "utf-8"))

        server.registerResource(
            doc.name,
            doc.uri,
            {
                annotations: {
                    priority: 1,
                    audience: ["assistant"],
                    lastModified: nodeFs.statSync(filePath).mtime.toISOString()
                },
                size: parseResult.size,
                description: parseResult.description
            },
            requestUri => {
                return {
                    contents: [
                        {
                            mimeType: "text/markdown",
                            text: resolveReadText(doc.uri, doc.content, requestUri),
                            uri: doc.uri
                        }
                    ]
                }
            }
        )
    }

    return docs
}

/** 纯读取：扫描 assets/docs 全部 md（含 zh-cn/ 与 agent/ 层），供 server 与校验脚本共用 */
export function loadDocEntries(): DocEntry[] {
    const docsDir = resolveResourceDir("docs")
    const docs: DocEntry[] = []
    const fileNames = nodeFs.readdirSync(docsDir, {
        recursive: true
    })

    for (let fileName of fileNames) {
        if (typeof fileName !== "string") {
            fileName = fileName.toString()
        }
        if (!fileName.endsWith(".md")) {
            continue
        }
        fileName = fileName.replace(/\\/g, "/")

        const uri = `docs://${fileName}`
        const relativePath = fileName.replace(/\.md$/, "")
        const info = docInfoFromUri(fileName)
        // 带目录前缀转驼峰，避免不同目录/语言层同名文档冲突（如 basic/forms 与 zh-cn/basic/forms）
        const camelDocName = qingkuaiUtil.kebab2Camel(relativePath.replace(/\//g, "-"), true)
        const filePath = nodePath.join(docsDir, fileName)
        const parseResult = parseDocContent(nodeFs.readFileSync(filePath, "utf-8"))
        docs.push({
            uri,
            name: camelDocName,
            content: parseResult.content,
            description: parseResult.description,
            keywords: parseResult.keywords,
            lang: info.lang,
            layer: info.layer
        })
    }

    return docs
}

/** 请求 URI 带 #fragment 时返回对应章节，否则返回全文 */
function resolveReadText(uri: string, fullContent: string, requestUri: URL): string {
    if (!requestUri.hash) {
        return fullContent
    }
    const anchor = decodeURIComponent(requestUri.hash.slice(1))
    const stub = {
        uri,
        name: "",
        canonicalUri: uri,
        description: "",
        keywords: [],
        lang: "en" as const,
        layer: "tutorial" as const
    }
    const titleMatch = /^#\s+(.+)$/m.exec(fullContent)
    const sections = parseDocSections(stub, fullContent, titleMatch ? titleMatch[1] : "")
    const matched =
        sections.find(section => section.anchor === anchor) ??
        sections.find(section => section.anchor.toLowerCase() === anchor.toLowerCase())
    return matched ? matched.content : fullContent
}

function parseDocContent(string: string) {
    const m = mdMetaDataRE.exec(string)

    let content: string
    let description = ""
    let keywords: string[] = []

    if (m) {
        content = string.slice(m[0].length)

        const properties = m[1].split("\n").reduce(
            (acc, line) => {
                const match = mdMetaDataLineRE.exec(line)
                if (match) {
                    acc[match[1].trim()] = match[2].trim()
                }
                return acc
            },
            {} as Record<string, string>
        )

        description = parseQuoted(properties.description)
        keywords = parseKeywords(properties.keywords)
    } else {
        // 无 YAML front matter 时，将整个文档内容作为 body，元数据留空
        content = string
    }

    return {
        content,
        size: Buffer.byteLength(content, "utf-8"),
        description,
        keywords
    }
}

function parseQuoted(value: string | undefined): string {
    if (!value) {
        return ""
    }
    try {
        return JSON.parse(value)
    } catch {
        return value
    }
}

function parseKeywords(value: string | undefined): string[] {
    if (!value) {
        return []
    }
    try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) {
            return parsed.map(item => String(item).trim()).filter(Boolean)
        }
    } catch {
        // fallthrough：按普通分隔字符串处理
    }
    return value
        .split(/[,，;；]/)
        .map(item => item.trim())
        .filter(Boolean)
}
