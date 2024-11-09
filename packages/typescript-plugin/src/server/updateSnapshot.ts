import { snapshotCache } from "../proxies"
import { QingKuaiSnapShot } from "../snapshot"
import { projectService, server, ts } from "../state"
import { isUndefined } from "../../../../shared-util/assert"
import { UpdateSnapshotParams } from "../../../../types/communication"

export function attachUpdateSnapshot() {
    server.onRequest<UpdateSnapshotParams>("updateSnapshot", params => {
        const { fileName, interCode, scriptKindKey } = params
        const scriptKind = ts.ScriptKind[scriptKindKey]
        const oldSnapshot = snapshotCache.get(fileName)
        const newSnapshot = new QingKuaiSnapShot(interCode, scriptKind)
        snapshotCache.set(fileName, newSnapshot)

        let scriptInfo = projectService.getScriptInfo(fileName)
        if (!isUndefined(scriptInfo) && !isUndefined(oldSnapshot)) {
            const change = newSnapshot.getChangeRange(oldSnapshot)
            const changeStart = change.span.start
            scriptInfo.editContent(
                changeStart,
                changeStart + change.span.length,
                newSnapshot.getText(changeStart, changeStart + change.newLength)
            )
        } else {
            // projectService.openClientFile(fileName, newSnapshot.getFullText(), scriptKind)
            // scriptInfo = projectService.getScriptInfo(fileName)!
            // if (!project.isRoot(scriptInfo)) {
            //     project.addRoot(scriptInfo)
            // }
        }
    })
}
