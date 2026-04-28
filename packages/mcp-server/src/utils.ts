import nodeFs from "node:fs"
import nodePath from "node:path"

import { dirname } from "./constants"

export function resolveResourceDir(subDir: "docs" | "prompts") {
    const candidates = [
        nodePath.join(dirname, "../assets", subDir),
        nodePath.join(dirname, "./assets", subDir),
        nodePath.join(dirname, "../../assets", subDir),
        nodePath.join(dirname, "../../../mcp-server/assets", subDir),
        nodePath.join(process.cwd(), "packages/mcp-server/assets", subDir),
        nodePath.join(process.cwd(), "packages/vscode-extension/dist/assets", subDir)
    ]

    for (const dir of candidates) {
        if (nodeFs.existsSync(dir)) {
            return dir
        }
    }

    throw new Error(
        `Qingkuai MCP assets directory not found for "${subDir}". Tried: ${candidates.join(", ")}`
    )
}