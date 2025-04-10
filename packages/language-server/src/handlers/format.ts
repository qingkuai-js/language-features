import type { FormatHandler } from "../types/handlers"

import { resolve } from "node:path"
import { getCompileRes } from "../compile"
import { documents, Logger } from "../state"
import { format as _format } from "qingkuai-language-service"

export const format: FormatHandler = async ({ textDocument }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    return _format(
        resolve(__dirname, "../node_modules/prettier-plugin-qingkuai/dist/index.js"),
        await getCompileRes(document),
        Logger.error.bind(Logger)
    )
}
