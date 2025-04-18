import type {
    TPICCommonRequestParams,
    ResolveCompletionParams
} from "../../../../types/communication"
import type TS from "typescript"

import { server } from "../state"
import { convertor } from "qingkuai-language-service/adapters"
import { TPICHandler } from "../../../../shared-util/constant"
import { getDefaultLanguageService } from "../util/typescript"
import { ScriptCompletionDetail } from "qingkuai-language-service"

export function attachGetCompletion() {
    server.onRequest<TPICCommonRequestParams, TS.CompletionInfo | null>(
        TPICHandler.GetCompletion,
        params => {
            const languageService = getDefaultLanguageService(params.fileName)
            if (!languageService) {
                return null
            }
            return convertor.getAndConvertCompletionInfo(languageService, params)
        }
    )

    server.onRequest<ResolveCompletionParams, ScriptCompletionDetail | null>(
        TPICHandler.ResolveCompletionItem,
        params => {
            const languageService = getDefaultLanguageService(params.fileName)
            if (!languageService) {
                return null
            }
            return convertor.getAndConvertCompletionDetail(languageService, params)
        }
    )
}
