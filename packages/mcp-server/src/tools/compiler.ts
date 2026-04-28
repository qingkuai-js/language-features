import type { McpServer } from "@modelcontextprotocol/server"

import { z } from "zod"
import { compile, compileIntermediate } from "qingkuai/compiler"
import { SYNTAX_CHECK_TOOL_DESCRIPTION, COMPILE_TOOL_DESCRIPTION } from "../constants"

export function registerCompilerTools(server: McpServer) {
    server.registerTool(
        "check_qingkuai_syntax",
        {
            inputSchema: z.object({
                source: z.string().min(1).describe("Qingkuai (.qk) source code to check"),
                shorthandDerivedDeclaration: z
                    .boolean()
                    .optional()
                    .describe(
                        "Enable shorthand derived declaration syntax (e.g., $var instead of derived()). Default: false"
                    )
            }),
            title: "Check Qingkuai Syntax",
            description: SYNTAX_CHECK_TOOL_DESCRIPTION
        },
        async ({ source, shorthandDerivedDeclaration }) => {
            try {
                const result = compileIntermediate(source, {
                    shorthandDerivedDeclaration
                })

                const errorCount = result.messages.filter(m => m.type === "error").length
                const warningCount = result.messages.filter(m => m.type === "warning").length

                const summary = {
                    errorCount,
                    warningCount,
                    messages: result.messages,
                    status: errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "success"
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(summary, null, 2)
                        }
                    ],
                    structuredContent: summary
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Syntax check failed: ${errorMessage}`
                        }
                    ]
                }
            }
        }
    )

    server.registerTool(
        "compile_qingkuai",
        {
            inputSchema: z.object({
                source: z.string().min(1).describe("Qingkuai (.qk) source code to compile"),
                hashId: z
                    .string()
                    .optional()
                    .describe("Hash ID for the component. Default: auto-generated"),
                debug: z.boolean().optional().describe("Enable debug mode. Default: false"),
                sourcemap: z.boolean().optional().describe("Generate source map. Default: false"),
                interpretiveComments: z
                    .boolean()
                    .optional()
                    .describe("Preserve interpretive comments. Default: false"),
                preserveHtmlComments: z
                    .boolean()
                    .optional()
                    .describe("Preserve HTML comments in template. Default: false"),
                shorthandDerivedDeclaration: z
                    .boolean()
                    .optional()
                    .describe("Enable shorthand derived declaration syntax. Default: false"),
                reactivityMode: z
                    .enum(["reactive", "shallow"])
                    .optional()
                    .describe("Default reactivity mode for variables. Default: 'reactive'"),
                whitespace: z
                    .enum(["preserve", "trim", "collapse", "trim-collapse"])
                    .optional()
                    .describe("Whitespace handling in templates. Default: 'trim'")
            }),
            title: "Compile Qingkuai Code",
            description: COMPILE_TOOL_DESCRIPTION
        },
        async ({
            source,
            hashId,
            debug,
            sourcemap,
            interpretiveComments,
            preserveHtmlComments,
            shorthandDerivedDeclaration,
            reactivityMode,
            whitespace
        }) => {
            try {
                const result = compile(source, {
                    hashId,
                    debug,
                    sourcemap,
                    interpretiveComments,
                    preserveHtmlComments,
                    shorthandDerivedDeclaration,
                    reactivityMode,
                    whitespace
                })

                const errorCount = result.messages.filter(m => m.type === "error").length
                const warningCount = result.messages.filter(m => m.type === "warning").length

                const summary = {
                    errorCount,
                    warningCount,
                    hashId: result.hashId,
                    messages: result.messages,
                    codeLength: result.code.length,
                    hasMappings: !!result.mappings,
                    status: errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "success",
                    code:
                        result.code.slice(0, 500) +
                        (result.code.length > 500 ? "...[truncated]" : "")
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(summary, null, 2)
                        }
                    ],
                    structuredContent: summary
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Compilation failed: ${errorMessage}`
                        }
                    ]
                }
            }
        }
    )
}
