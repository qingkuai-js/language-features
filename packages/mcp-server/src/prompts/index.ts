import type { McpServer } from "@modelcontextprotocol/server"

import nodeFs from "node:fs"
import nodePath from "node:path"

import { resolveResourceDir } from "../utils"

export function registerPrompts(server: McpServer) {
    const promptsDir = resolveResourceDir("prompts")
    const allFileNames = nodeFs.readdirSync(promptsDir)
    const fileNames = allFileNames.filter(fileName => fileName.endsWith(".md"))

    for (const fileName of fileNames) {
        const promptName = nodePath.basename(fileName, ".md")
        const promptPath = nodePath.join(promptsDir, fileName)
        const text = nodeFs.readFileSync(promptPath, "utf-8")
        const words = promptName.split("-")
        const capitalizedWords = words.map(w => {
            return w.charAt(0).toUpperCase() + w.slice(1)
        })

        server.registerPrompt(
            promptName,
            {
                title: capitalizedWords.join(" ")
            },
            () => ({
                messages: [
                    {
                        content: {
                            text,
                            type: "text"
                        },
                        role: "user"
                    }
                ]
            })
        )
    }
}
