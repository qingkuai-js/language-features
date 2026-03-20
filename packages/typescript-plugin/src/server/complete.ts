import type {
    GetCompletionsParms,
    GetCompletionsResult,
    ResolveCompletionParams
} from "../../../../types/communication"
import type { ScriptCompletionDetail } from "qingkuai-language-service"

import { adapter, tsPluginIpcServer } from "../state"
import { TP_HANDLERS } from "../../../../shared-util/constant"

export function attachGetCompletion() {
    tsPluginIpcServer.onRequest<GetCompletionsParms, GetCompletionsResult | null>(
        TP_HANDLERS.GetCompletion,
        params => adapter.service.getCompletionInfo(params)
    )

    tsPluginIpcServer.onRequest<ResolveCompletionParams, ScriptCompletionDetail | null>(
        TP_HANDLERS.ResolveCompletionItem,
        params => adapter.service.getCompletionDetail(params)
    )
}
