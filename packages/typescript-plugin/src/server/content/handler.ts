import type { ASTPositionWithFlag } from "qingkuai/compiler"
import type { UpdateSnapshotParams } from "../../../../../types/communication"

import {
    recoverItos,
    recoverPositions,
    recoverPostionFlags
} from "../../../../../shared-util/qingkuai"
import { fileURLToPath } from "node:url"
import { updateQingkuaiSnapshot } from "./snapshot"
import { refreshDiagnostics } from "../diagnostic/refresh"
import { isUndefined } from "../../../../../shared-util/assert"
import { TPICHandler } from "../../../../../shared-util/constant"
import { openQingkuaiFiles, server, snapshotCache, ts } from "../../state"

export function attachDocumentManager() {
    server.onNotification(TPICHandler.didOpen, (uri: string) => {
        const fileName = fileURLToPath(uri)
        openQingkuaiFiles.add(fileName)
    })

    server.onNotification(TPICHandler.didClose, (uri: string) => {
        const fileName = fileURLToPath(uri)
        openQingkuaiFiles.delete(fileName)
    })
}

export function attachUpdateSnapshot() {
    server.onRequest<UpdateSnapshotParams>(TPICHandler.updateSnapshot, ({ fileName, ...rest }) => {
        const positionFlags = recoverPostionFlags(rest.cpf)
        const scriptKind = ts.ScriptKind[rest.scriptKindKey]
        const oriScriptKind = snapshotCache.get(fileName)?.scriptKind
        const positions = recoverPositions(rest.cp).map((position, index) => {
            return {
                ...position,
                flag: positionFlags[index]
            } satisfies ASTPositionWithFlag
        })
        const componentIdentifiers = updateQingkuaiSnapshot(
            fileName,
            rest.interCode,
            recoverItos(rest.citos),
            rest.slotInfo,
            scriptKind,
            positions
        )
        refreshDiagnostics(fileName, !isUndefined(oriScriptKind) && scriptKind !== oriScriptKind)
        return componentIdentifiers
    })
}
