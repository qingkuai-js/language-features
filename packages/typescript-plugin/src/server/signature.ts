import type { SignatureHelpParams } from "../../../../types/communication"

import { adapter, tsPluginIpcServer } from "../state"
import { TP_HANDLERS } from "../../../../shared-util/constant"

export function attachGetSignatureHelp() {
    tsPluginIpcServer.onRequest<SignatureHelpParams>(TP_HANDLERS.GetSignatureHelp, params =>
        adapter.service.getSignatureHelp(params)
    )
}
