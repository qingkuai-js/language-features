import type { TPICCommonRequestParams } from "../../../../types/communication"

import { tsPluginIpcServer, adapter } from "../state"
import { TP_HANDLERS } from "../../../../shared-util/constant"

export function attachFindImplementation() {
    tsPluginIpcServer.onRequest<TPICCommonRequestParams>(TP_HANDLERS.FindImplemention, params =>
        adapter.service.getImplementations(params)
    )
}
