import type { FormatHandler } from "../types/handlers"

import prettier from "prettier"

import * as qingkuaiPrettierPlugin from "prettier-plugin-qingkuai"

import { documents, Logger } from "../state"
import { getCompileResult } from "../compile"
import { format as _format } from "qingkuai-language-service"

export const format: FormatHandler = async ({ textDocument }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    return _format(
        [prettier, qingkuaiPrettierPlugin],
        await getCompileResult(document),
        Logger.error.bind(Logger)
    )
}
