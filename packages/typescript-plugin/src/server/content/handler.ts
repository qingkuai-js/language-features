import type { UpdateSnapshotParams } from "../../../../../types/communication"

import { fileURLToPath } from "url"
import { updateQingkuaiSnapshot } from "./snapshot"
import { refreshDiagnostics } from "../diagnostic/refresh"
import { isUndefined } from "../../../../../shared-util/assert"
import { projectService, server, snapshotCache, ts } from "../../state"

export function attachDocumentManager() {
    server.onNotification("onDidOpen", (uri: string) => {
        projectService.openClientFile(fileURLToPath(uri))
    })

    server.onNotification("onDidClose", (uri: string) => {
        projectService.closeClientFile(fileURLToPath(uri))
    })
}

export function attachUpdateSnapshot() {
    server.onRequest<UpdateSnapshotParams>("updateSnapshot", ({ fileName, ...rest }) => {
        const scriptKind = ts.ScriptKind[rest.scriptKindKey]
        const oriScriptKind = snapshotCache.get(fileName)?.scriptKind
        const componentIdentifiers = updateQingkuaiSnapshot(
            fileName,
            rest.interCode,
            rest.itos,
            rest.slotInfo,
            scriptKind
        )
        refreshDiagnostics(fileName, !isUndefined(oriScriptKind) && scriptKind !== oriScriptKind)
        return componentIdentifiers
    })
}
