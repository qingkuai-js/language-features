import fs from "fs"
import assert from "assert"
import { compile } from "qingkuai/compiler"
import { QingKuaiSnapShot } from "../snapshot"
import { getScriptKindKey } from "../../../../shared-util/qingkuai"
import { updateQingkuaiSnapshot } from "../server/content/snapshot"
import { projectService, snapshotCache, ts, typeRefStatement } from "../state"

export function isQingkuaiFileName(fileName: string) {
    return fileName.endsWith(".qk")
}

export function compileQingkuaiFileToInterCode(fileName: string) {
    assert(fs.existsSync(fileName))

    return compile(fs.readFileSync(fileName, "utf-8")!, {
        check: true,
        typeRefStatement
    })
}

export function ensureGetSnapshotOfQingkuaiFile(fileName: string) {
    if (snapshotCache.has(fileName)) {
        return initialEditScriptInfo(fileName), snapshotCache.get(fileName)!
    }

    const compileRes = compileQingkuaiFileToInterCode(fileName)
    const scriptKind = ts.ScriptKind[getScriptKindKey(compileRes)]
    snapshotCache.set(
        fileName,
        new QingKuaiSnapShot(
            compileRes.code,
            true,
            scriptKind,
            compileRes.interIndexMap.itos,
            compileRes.inputDescriptor.slotInfo
        )
    )

    return initialEditScriptInfo(fileName), snapshotCache.get(fileName)!
}

function initialEditScriptInfo(fileName: string) {
    const qingkuaiSnapshot = snapshotCache.get(fileName)!
    const scriptInfo = projectService.getScriptInfo(fileName)

    if (qingkuaiSnapshot.initial && scriptInfo) {
        qingkuaiSnapshot.initial = false

        const oldLength = scriptInfo.getSnapshot().getLength()
        const qingkuaiSnapshotContent = qingkuaiSnapshot.getFullText()
        scriptInfo.editContent(0, oldLength, qingkuaiSnapshotContent)
        updateQingkuaiSnapshot(
            fileName,
            qingkuaiSnapshotContent,
            qingkuaiSnapshot.itos,
            qingkuaiSnapshot.slotInfo,
            qingkuaiSnapshot.scriptKind
        )
    }
}
