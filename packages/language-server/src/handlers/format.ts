import type { FormatHandler } from "../types/handlers"

import path from "node:path"
import prettier from "prettier"
import { getCompileRes } from "../compile"
import { documents, Logger } from "../state"

export const format: FormatHandler = async ({ textDocument }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    const { config } = await getCompileRes(document)
    try {
        const pluginPath = path.resolve(
            __dirname,
            "../node_modules/prettier-plugin-qingkuai/dist/index.js"
        )
        const formatedContent = await prettier.format(document.getText(), {
            ...config.prettierConfig,
            parser: "qingkuai",
            plugins: [pluginPath],
            spaceAroundInterpolation: config.extensionConfig.insertSpaceAroundInterpolation,
            componentTagFormatPreference: config.extensionConfig.componentTagFormatPreference
        })

        return [
            {
                range: {
                    start: document.positionAt(0),
                    end: document.positionAt(document.getText().length)
                },
                newText: formatedContent
            }
        ]
    } catch (e: any) {
        Logger.error("Formatting failure with an fatal error: " + e.message || "")
    }
}
