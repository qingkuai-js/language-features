import { projectService } from "../../state"
import { updateQingkuaiSnapshot } from "./snapshot"
import { ensureGetSnapshotOfQingkuaiFile } from "../../util/qingkuai"

export function initialEditQingkuaiFileSnapshot(fileName: string) {
    const qingkuaiSnapshot = ensureGetSnapshotOfQingkuaiFile(fileName)
    if (qingkuaiSnapshot.initial) {
        const scriptInfo = projectService.getScriptInfo(fileName)!
        qingkuaiSnapshot.initial = false
        scriptInfo.editContent(
            0,
            scriptInfo.getSnapshot().getLength(),
            qingkuaiSnapshot.getFullText()
        )
        setTimeout(() => {
            updateQingkuaiSnapshot(
                fileName,
                qingkuaiSnapshot.getFullText(),
                qingkuaiSnapshot.itos,
                qingkuaiSnapshot.slotInfo,
                qingkuaiSnapshot.scriptKind,
                qingkuaiSnapshot.positions
            )
        })
    }
}
