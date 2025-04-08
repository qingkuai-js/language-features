import type { SignatureHelpParams } from "../../../../types/communication"

import { server } from "../state"
import { getDefaultLanguageService } from "../util/typescript"
import { TPICHandler } from "../../../../shared-util/constant"
import { convertor } from "qingkuai-language-service/adapters"

export function attachGetSignatureHelp() {
    server.onRequest<SignatureHelpParams>(TPICHandler.GetSignatureHelp, params => {
        const languageService = getDefaultLanguageService(params.fileName)
        if (!languageService) {
            return null
        }
        return convertor.getAndConvertSignatureHelp(languageService, params)
    })
}
