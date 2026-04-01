import type { FormatHandler } from "../types/handlers"

import prettier from "prettier"
import nodeModule from "node:module"

import { documents, Logger } from "../state"
import { getCompileResult } from "../compile"
import { format as _format } from "qingkuai-language-service"

const require = nodeModule.createRequire(import.meta.url)

export const format: FormatHandler = async ({ textDocument }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    const pluginPath = require.resolve("prettier-plugin-qingkuai")

    return _format(
        [prettier, pluginPath],
        await getCompileResult(document),
        Logger.error.bind(Logger)
    )
}
