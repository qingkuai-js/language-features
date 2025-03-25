import type { FormatHandler } from "../types/handlers"

import path from "node:path"
import prettier from "prettier"
import stripAnsi from "strip-ansi"
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
            ...config.prettierConfig.qingkuai
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
        if (!e.message) {
            Logger.error(
                "Fatal error encountered while formatting document(no related information)"
            )
        }
        Logger.error("Fatala error encountered while formatting document: " + stripAnsi(e.message))
    }
}
