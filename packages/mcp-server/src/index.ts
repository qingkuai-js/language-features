import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import { SERVER_INSTRUCTIONS } from "./constants"
import { registerPrompts } from "./prompts"
import { registerDocTools } from "./tools/docs"
import { loadDocResources } from "./resources/docs"
import { registerFormatTools } from "./tools/format"
import { registerCompilerTools } from "./tools/compiler"

const server = new McpServer(
    {
        version: "1.0.0",
        name: "qingkuai-mcp-server",
        title: "Qingkuai MCP Server",
        websiteUrl: "https://qingkuai.dev",
        description: "Qingkuai MCP server for .qk tooling, including syntax reference, validation, and compiler-related tools"
    },
    {
        capabilities: {
            tools: {},
            prompts: {},
            resources: {}
        },
        // 随 initialize 响应（InitializeResult.instructions）下发，宿主注入模型上下文
        instructions: SERVER_INSTRUCTIONS
    }
)

registerPrompts(server)
registerFormatTools(server)
registerCompilerTools(server)
registerDocTools(server, loadDocResources(server))
await server.connect(new StdioServerTransport())
