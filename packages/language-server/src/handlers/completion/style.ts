import type { CachedCompileResultItem } from "../../types/service"
import type { GetClientConfigParams } from "../../../../../types/communication"

import { connection, cssLanguageService } from "../../state"
import { LSHandler } from "../../../../../shared-util/constant"
import { createStyleSheetAndDocument } from "../../util/qingkuai"

export async function doStyleBlockComplete(cr: CachedCompileResultItem, offset: number) {
    const getConfigParams: GetClientConfigParams = {
        uri: cr.uri,
        section: "css",
        name: "completion"
    }
    return cssLanguageService.doComplete(
        ...createStyleSheetAndDocument(cr, offset)!,
        await connection.sendRequest(LSHandler.GetClientConfig, getConfigParams)
    )
}
