import type { GetDiagnosticResultItem } from "../../../../../types/communication"

import { refreshDiagnostics } from "./refresh"
import { tsPluginIpcServer, adapter } from "../../state"
import { TP_HANDLERS } from "../../../../../shared-util/constant"

export function attachGetDiagnostic() {
    tsPluginIpcServer.onRequest<string, GetDiagnosticResultItem[]>(
        TP_HANDLERS.GetDiagnostic,
        fileName => adapter.service.getDiagnostics(fileName)
    )
}

export function attachRefreshDiagnostic() {
    tsPluginIpcServer.onNotification(TP_HANDLERS.RefreshDiagnostic, refreshDiagnostics)
}
