import type { DocEntry } from "../types"
import type { McpServer } from "@modelcontextprotocol/server"

import nodeFs from "node:fs"
import nodePath from "node:path"

import { resolveResourceDir } from "../utils"
import { util as qingkuaiUtil } from "qingkuai/compiler"
import { mdMetaDataLineRE, mdMetaDataRE } from "../regular"

export function loadDocResources(server: McpServer) {
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

        const uri = `docs://${fileName}`
        const docName = nodePath.parse(fileName).name
        const filePath = nodePath.join(docsDir, fileName)
        const camelDocName = qingkuaiUtil.kebab2Camel(docName, true)
        const parseResult = parseDocContent(nodeFs.readFileSync(filePath, "utf-8"), filePath)
        docs.push({
            uri,
            name: camelDocName,
            content: parseResult.content,
            description: parseResult.description
        })

        server.registerResource(
            camelDocName,
            uri,
            {
                annotations: {
                    priority: 1,
                    audience: ["assistant"],
                    lastModified: nodeFs.statSync(filePath).mtime.toISOString()
                },
                size: parseResult.size,
                description: parseResult.description
            },
            () => {
                return {
                    contents: [
                        {
                            mimeType: "text/markdown",
                            text: parseResult.content,
                            uri
                        }
                    ]
                }
            }
        )
    }

    return docs
}

function parseDocContent(string: string, filepath: string) {
    const m = mdMetaDataRE.exec(string)

    let content: string
    let description = ""

    if (m) {
        content = string.slice(m[0].length)

        const properties = m[1].split("\n").reduce(
            (acc, line) => {
                const match = mdMetaDataLineRE.exec(line)
                if (match) {
                    acc[match[1].trim()] = JSON.parse(match[2].trim())
                }
                return acc
            },
            {} as Record<string, string>
        )

        description = properties.description || ""
    } else {
        // 无 YAML front matter 时，将整个文档内容作为 body，description 留空
        content = string
    }

    return {
        content,
        size: Buffer.byteLength(content, "utf-8"),
        description
    }
}
