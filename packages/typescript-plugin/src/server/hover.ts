import type { TPICCommonRequestParams, HoverTipResult } from "../../../../types/communication"

import { adapter, tsPluginIpcServer } from "../state"
import { TP_HANDLERS } from "../../../../shared-util/constant"

export function attachHoverTip() {
    tsPluginIpcServer.onRequest<TPICCommonRequestParams, HoverTipResult | null>(TP_HANDLERS.HoverTip, params =>
        adapter.service.getHoverTip(params)
    )
}
