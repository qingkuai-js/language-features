import type { FormatHandler } from "../types/handlers"

import prettier from "prettier"
import { resolve } from "node:path"
import { getCompileRes } from "../compile"
import { documents, Logger } from "../state"
import { format as _format } from "qingkuai-language-service"

export const format: FormatHandler = async ({ textDocument }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    const pluginPath = resolve(__dirname, "../node_modules/prettier-plugin-qingkuai/dist/index.js")
    return _format([prettier, pluginPath], await getCompileRes(document), Logger.error.bind(Logger))
}
