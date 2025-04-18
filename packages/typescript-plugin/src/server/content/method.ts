import type TS from "typescript"
import type { QingKuaiSnapShot } from "../../snapshot"
import type { RealPath } from "../../../../../types/common"

import { projectService } from "../../state"
import { updateQingkuaiSnapshot } from "./snapshot"
import { ensureGetSnapshotOfQingkuaiFile } from "../../util/qingkuai"

export function initialEditQingkuaiFileSnapshot(fileName: RealPath) {
    const qingkuaiSnapshot = ensureGetSnapshotOfQingkuaiFile(fileName)
    const scriptInfo = projectService.getScriptInfo(fileName)
    if (scriptInfo && qingkuaiSnapshot.initial) {
        setTimeout(() => {
            updateQingkuaiSnapshot(
                fileName,
                qingkuaiSnapshot.getFullText(),
                qingkuaiSnapshot.itos,
                qingkuaiSnapshot.slotInfo,
                qingkuaiSnapshot.scriptKind,
                qingkuaiSnapshot.typeDeclarationLen,
                qingkuaiSnapshot.positions
            )
        })
        replaceSourceContentWithInterCodeOfScritptInfo(qingkuaiSnapshot, scriptInfo)
    }
}

export function replaceSourceContentWithInterCodeOfScritptInfo(
    snapshot: QingKuaiSnapShot,
    scriptInfo: TS.server.ScriptInfo
) {
    snapshot.initial = false
    scriptInfo.editContent(0, scriptInfo.getSnapshot().getLength(), snapshot.getFullText())
}
