import type { RealPath } from "../../../../../types/common"
import type { ASTPositionWithFlag } from "qingkuai/compiler"
import type { UpdateSnapshotParams } from "../../../../../types/communication"

import {
    ts,
    server,
    setState,
    projectService,
    openQingkuaiFiles,
    lsProjectKindChanged
} from "../../state"
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
import { isQingkuaiFileName } from "../../../../../shared-util/assert"
import { replaceSourceContentWithInterCodeOfScritptInfo } from "./method"
import { ensureGetSnapshotOfQingkuaiFile, recordRealPath } from "../../util/qingkuai"

export function attachDocumentManager() {
    server.onNotification(TPICHandler.DidOpen, (uri: string) => {
        const fileName = fileURLToPath(uri) as RealPath
        recordRealPath(fileName)
        openQingkuaiFiles.add(fileName)
        projectService.openClientFile(fileName)
    })

    server.onNotification(TPICHandler.DidClose, (uri: string) => {
        const fileName = fileURLToPath(uri) as RealPath
        openQingkuaiFiles.delete(fileName)
        projectService.closeClientFile(fileName)
    })
}

export function attachUpdateSnapshot() {
    server.onRequest<UpdateSnapshotParams>(TPICHandler.UpdateSnapshot, ({ fileName, ...rest }) => {
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

        if (qingkuaiSnapshot.initial) {
            replaceSourceContentWithInterCodeOfScritptInfo(
                qingkuaiSnapshot,
                projectService.getScriptInfo(fileName)!
            )
        }

        if (scriptKindChanged) {
            projectService.getScriptInfo(fileName)?.detachAllProjects()
            projectService.openClientFile(fileName)
            if (!isFileOpening(fileName)) {
                projectService.closeClientFile(fileName)
            }
        }

        if (!lsProjectKindChanged && scriptKind === ts.ScriptKind.TS) {
            setState({ lsProjectKindChanged: true })
            server.sendNotification(TPICHandler.InfferedProjectAsTypescript, null)
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
    server.onRequest(TPICHandler.GetLanguageId, (fileName: RealPath) => {
        if (!isQingkuaiFileName(fileName)) {
            return void 0
        }

        const scriptKind = ensureGetSnapshotOfQingkuaiFile(fileName).scriptKind
        return scriptKind === ts.ScriptKind.TS ? "typescript" : "javascript"
    })
}
