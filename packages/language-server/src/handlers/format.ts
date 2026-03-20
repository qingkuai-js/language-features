import type { FormatHandler } from "../types/handlers"

import prettier from "prettier"
import nodePath from "node:path"

import { documents, Logger } from "../state"
import { getCompileResult } from "../compile"
import { format as _format } from "qingkuai-language-service"

export const format: FormatHandler = async ({ textDocument }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    const pluginPath = nodePath.resolve(
        __dirname,
        "../node_modules/prettier-plugin-qingkuai/dist/index.js"
    )
    return _format(
        [prettier, pluginPath],
        await getCompileResult(document),
        Logger.error.bind(Logger)
    )
}
