import type { TPICCommonRequestParams } from "../../../../types/communication"

import { tsPluginIpcServer, adapter } from "../state"
import { TP_HANDLERS } from "../../../../shared-util/constant"

export function attachFindReference() {
    tsPluginIpcServer.onRequest<TPICCommonRequestParams>(TP_HANDLERS.FindReference, async params =>
        adapter.service.getReferences(params)
    )
}
