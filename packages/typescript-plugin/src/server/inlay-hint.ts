import type { GetInlayHintResultItem } from "../../../../types/communication"

import { tsPluginIpcServer, adapter } from "../state"
import { TP_HANDLERS } from "../../../../shared-util/constant"

export function attachGetInlayHint() {
    tsPluginIpcServer.onRequest<string, GetInlayHintResultItem[]>(
        TP_HANDLERS.GetInlayHint,
        fileName => adapter.service.getInlayHints(fileName)
    )
}
