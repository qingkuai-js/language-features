import type { ASTPositionWithFlag } from "qingkuai/compiler"
import type { UpdateSnapshotParams } from "../../../../../types/communication"

import {
    recoverItos,
    recoverPositions,
    recoverPostionFlags
} from "../../../../../shared-util/qingkuai"
import { fileURLToPath } from "node:url"
import { updateQingkuaiSnapshot } from "./snapshot"
import { isFileOpening } from "../../util/typescript"
import { refreshDiagnostics } from "../diagnostic/refresh"
import { TPICHandler } from "../../../../../shared-util/constant"
import { ensureGetSnapshotOfQingkuaiFile } from "../../util/qingkuai"
import { isQingkuaiFileName } from "../../../../../shared-util/assert"
import { ts, server, projectService, openQingkuaiFiles } from "../../state"

export function attachDocumentManager() {
    server.onNotification(TPICHandler.didOpen, (uri: string) => {
        const fileName = fileURLToPath(uri)
        openQingkuaiFiles.add(fileName)
        projectService.openClientFile(fileName)
    })

    server.onNotification(TPICHandler.didClose, (uri: string) => {
        const fileName = fileURLToPath(uri)
        openQingkuaiFiles.delete(fileName)
        projectService.closeClientFile(fileName)
    })
}

export function attachUpdateSnapshot() {
    server.onRequest<UpdateSnapshotParams>(TPICHandler.updateSnapshot, ({ fileName, ...rest }) => {
        const positionFlags = recoverPostionFlags(rest.cpf)
        const scriptKind = ts.ScriptKind[rest.scriptKindKey]
        const qingkuaiSnapshot = ensureGetSnapshotOfQingkuaiFile(fileName)
        const scriptKindChanged = scriptKind !== qingkuaiSnapshot.scriptKind
        const positions = recoverPositions(rest.cp).map((position, index) => {
            return {
                ...position,
                flag: positionFlags[index]
            } satisfies ASTPositionWithFlag
        })

        if (scriptKindChanged) {
            projectService.openClientFile(fileName)
            if (!isFileOpening(fileName)) {
                projectService.closeClientFile(fileName)
            }
        }

        const componentIdentifiers = updateQingkuaiSnapshot(
            fileName,
            rest.interCode,
            recoverItos(rest.citos),
            rest.slotInfo,
            scriptKind,
            positions
        )
        refreshDiagnostics(fileName, scriptKindChanged)
        return componentIdentifiers
    })
}

export function attachGetLanguageId() {
    server.onRequest(TPICHandler.getLanguageId, (fileName: string) => {
        if (!isQingkuaiFileName(fileName)) {
            return void 0
        }

        const scriptKind = ensureGetSnapshotOfQingkuaiFile(fileName).scriptKind
        return scriptKind === ts.ScriptKind.TS ? "typescript" : "javascript"
    })
}
