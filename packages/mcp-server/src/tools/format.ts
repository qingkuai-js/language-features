import type { McpServer } from "@modelcontextprotocol/server"

import prettier from "prettier"
import nodeModule from "node:module"
import nodeFs from "node:fs/promises"

import { z } from "zod"
import { FORMAT_CODE_TOOL_DESCRIPTION } from "../constants"

const nodeRequire = nodeModule.createRequire(import.meta.url)
const prettierPluginQingkuaiPath = nodeRequire.resolve("prettier-plugin-qingkuai")

export function registerFormatTools(server: McpServer) {
    server.registerTool(
        "format_qingkuai_code",
        {
            inputSchema: z.object({
                filePath: z.string().min(1).describe("Absolute or workspace-relative path to the .qk file to format and write back")
            }),
            title: "Format Qingkuai Code",
            description: FORMAT_CODE_TOOL_DESCRIPTION
        },
        async ({ filePath }) => {
            try {
                const source = await nodeFs.readFile(filePath, "utf-8")
                const prettierConfig = await prettier.resolveConfig(filePath)
                const formatted = await prettier.format(source, {
                    ...prettierConfig,
                    filepath: filePath,
                    parser: "qingkuai",
                    plugins: [prettierPluginQingkuaiPath]
                })
                await nodeFs.writeFile(filePath, formatted, "utf-8")

                const changed = source !== formatted

                return {
                    content: [
                        {
                            type: "text",
                            text: `Formatted and wrote file: ${filePath}`
                        }
                    ],
                    structuredContent: {
                        status: "success",
                        filePath,
                        changed,
                        formattedCode: formatted
                    }
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Formatting failed: ${errorMessage}`
                        }
                    ]
                }
            }
        }
    )
}