import type { TPICCommonRequestParams, HoverTipResult } from "../../../../types/communication"

import { server } from "../state"
import { TPICHandler } from "../../../../shared-util/constant"
import { getDefaultLanguageService } from "../util/typescript"
import { convertor } from "qingkuai-language-service/adapters"

export function attachHoverTip() {
    server.onRequest<TPICCommonRequestParams, HoverTipResult | null>(
        TPICHandler.HoverTip,
        params => {
            const languageService = getDefaultLanguageService(params.fileName)
            if (!languageService) {
                return null
            }
            return convertor.getAndConvertHoverTip(languageService, params)
        }
    )
}
