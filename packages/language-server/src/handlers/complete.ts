import type {
    InsertSnippetParams,
    GetCompletionsParms,
    GetCompletionsResult,
    ResolveCompletionParams
} from "../../../../types/communication"
import type { CompletionItem, CompletionTriggerKind } from "vscode-languageserver"
import type { CompletionHandler, ResolveCompletionHandler } from "../types/handlers"

import {
    doComplete,
    ScriptCompletionDetail,
    resolveScriptBlockCompletion
} from "qingkuai-language-service"
import { isString } from "../../../../shared-util/assert"
import { getComponentInfos as _getComponentInfos } from "../client"
import { getCompileResult, getCompileResultByPath } from "../compile"
import { LS_HANDLERS, TP_HANDLERS } from "../../../../shared-util/constant"
import { tpic, documents, connection, projectKind, isTestingEnv } from "../state"

export const complete: CompletionHandler = async ({ textDocument, position, context }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    const offset = document.offsetAt(position)
    const cr = await getCompileResult(document)
    const trigger = context?.triggerCharacter || ""

    const getComponentInfos = (fileName: string) => {
        return _getComponentInfos(fileName, 30)
    }

    return await doComplete(
        cr,
        offset,
        trigger,
        isTestingEnv,
        projectKind,
        insertSnippet,
        getComponentInfos,
        getScriptCompletions,
        context?.triggerKind
    )
}

export const resolveCompletion: ResolveCompletionHandler = async (item, token) => {
    if (!isString(item.data?.kind) || token.isCancellationRequested) {
        return item
    }
    return await resolveScriptBlockCompletion(
        item,
        getCompileResultByPath,
        getScriptCompletionDetail
    )
}

// 在客户端活跃文档中插入代码片段
function insertSnippet(snippet: string | InsertSnippetParams) {
    connection.sendNotification(
        LS_HANDLERS.InsertSnippet,
        isString(snippet) ? { text: snippet } : snippet
    )
}

async function getScriptCompletions(
    fileName: string,
    pos: number,
    triggerCharacter: string,
    triggerKind: CompletionTriggerKind | undefined
): Promise<GetCompletionsResult | null> {
    return await tpic.sendRequest<GetCompletionsParms>(TP_HANDLERS.GetCompletion, {
        fileName,
        pos,
        triggerKind,
        triggerCharacter
    })
}

async function getScriptCompletionDetail(item: CompletionItem): Promise<ScriptCompletionDetail> {
    return await tpic.sendRequest<ResolveCompletionParams>(
        TP_HANDLERS.ResolveCompletionItem,
        item.data
    )
}
