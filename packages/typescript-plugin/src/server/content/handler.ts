import type { UpdateSnapshotParams } from "../../../../../types/communication"

import { fileURLToPath } from "url"
import { server, ts } from "../../state"
import { updateQingkuaiSnapshot } from "./snapshot"
import { refreshDiagnostics } from "../diagnostic/refresh"
import { isUndefined } from "../../../../../shared-util/assert"
import { assignMappingFileForQkFile, getMappingFileInfo } from "./document"

export function attachDocumentManager() {
    server.onNotification("onDidOpen", (uri: string) => {
        const path = fileURLToPath(uri)
        assignMappingFileForQkFile(path, true)
    })

    server.onNotification("onDidClose", (uri: string) => {
        getMappingFileInfo(fileURLToPath(uri))!.isOpen = false
    })
}

export function attachUpdateSnapshot() {
    server.onRequest<UpdateSnapshotParams>("updateSnapshot", ({ fileName, ...rest }) => {
        const scriptKind = ts.ScriptKind[rest.scriptKindKey]
        const oriScriptKind = getMappingFileInfo(fileName)?.scriptKind
        updateQingkuaiSnapshot(fileName, rest.interCode, rest.itos, rest.slotInfo, scriptKind)
        refreshDiagnostics(fileName, !isUndefined(oriScriptKind) && scriptKind !== oriScriptKind)
    })
}
