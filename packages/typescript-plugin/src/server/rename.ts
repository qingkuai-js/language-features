import type { NumNum } from "../../../../types/common"
import type { RenameLocationItem, TPICCommonRequestParams } from "../../../../types/communication"

import { server } from "../state"
import { convertor } from "qingkuai-language-service/adapters"
import { TPICHandler } from "../../../../shared-util/constant"
import { getDefaultLanguageService } from "../util/typescript"

export function attachRename() {
    server.onRequest<TPICCommonRequestParams, RenameLocationItem[] | null>(
        TPICHandler.Rename,
        params => {
            const languageService = getDefaultLanguageService(params.fileName)
            if (!languageService) {
                return null
            }
            return convertor.renameAndConvert(languageService, params)
        }
    )
}

export function attachPrepareRename() {
    server.onRequest<TPICCommonRequestParams, NumNum | null>(TPICHandler.PrepareRename, params => {
        const languageService = getDefaultLanguageService(params.fileName)
        if (!languageService) {
            return null
        }
        return convertor.prepareRenameAndConvert(languageService, params)
    })
}
