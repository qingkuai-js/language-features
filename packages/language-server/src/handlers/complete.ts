import type {
    InsertSnippetParam,
    GetCompletionsResult,
    ResolveCompletionParams
} from "../../../../types/communication"
import type { RealPath } from "../../../../types/common"
import type { CompletionData } from "../../../language-service/src/types/service"
import type { CompletionHandler, ResolveCompletionHandler } from "../types/handlers"

import {
    doComplete,
    resolveEmmetCompletion,
    ScriptCompletionDetail,
    resolveScriptBlockCompletion
} from "qingkuai-language-service"
import { CompletionItem } from "vscode-languageserver"
import { isString } from "../../../../shared-util/assert"
import { getCompileRes, getCompileResByPath } from "../compile"
import { LSHandler, TPICHandler } from "../../../../shared-util/constant"
import { tpic, documents, connection, projectKind, isTestingEnv } from "../state"

export const complete: CompletionHandler = async ({ textDocument, position, context }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    const trigger = context?.triggerCharacter || ""
    const cr = await getCompileRes(document)
    const offset = cr.getOffset(position)
    return doComplete(
        cr,
        offset,
        trigger,
        document,
        isTestingEnv,
        projectKind,
        insertSnippet,
        getScriptCompletions
    )
}

export const resolveCompletion: ResolveCompletionHandler = async (item, token) => {
    if (!isString(item.data?.kind) || token.isCancellationRequested) {
        return item
    }

    const data: CompletionData = item.data
    if (data.kind === "emmet") {
        return resolveEmmetCompletion(item)
    }
    return await resolveScriptBlockCompletion(item, getCompileResByPath, getScriptCompletionDetail)
}

// 在客户端活跃文档中插入代码片段
function insertSnippet(snippet: string | InsertSnippetParam) {
    connection.sendNotification(
        LSHandler.InsertSnippet,
        isString(snippet) ? { text: snippet } : snippet
    )
}

async function getScriptCompletions(
    fileName: RealPath,
    pos: number
): Promise<GetCompletionsResult | null> {
    return await tpic.sendRequest(TPICHandler.GetCompletion, { fileName, pos })
}

async function getScriptCompletionDetail(item: CompletionItem): Promise<ScriptCompletionDetail> {
    return await tpic.sendRequest<ResolveCompletionParams>(
        TPICHandler.ResolveCompletionItem,
        item.data
    )
}
