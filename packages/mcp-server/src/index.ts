import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import { SERVER_INSTRUCTIONS } from "./constants"
import { registerPrompts } from "./prompts"
import { registerDocTools } from "./tools/docs"
import { loadDocResources } from "./resources/docs"
import { registerFormatTools } from "./tools/format"
import { registerCompilerTools } from "./tools/compiler"
import { setTypeScriptFromEnv } from "../../../shared-util/typescript"

// 复用宿主（VS Code 扩展）已安装的 typescript：发布包内不再附带完整的 typescript 包，
// 这里只登记入口文件路径，编译器首次使用时才真正加载
// Reuse the typescript installed by the host (the VS Code extension): the published extension no
// longer ships a full copy of the package. Only the entry file path is registered here; the
// implementation is loaded when the compiler is first used.
setTypeScriptFromEnv()

const server = new McpServer(
    {
        version: "1.0.0",
        name: "qingkuai-mcp-server",
        title: "Qingkuai MCP Server",
        websiteUrl: "https://qingkuai.dev",
        description:
            "Qingkuai MCP server for .qk tooling, including syntax reference, validation, and compiler-related tools"
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
