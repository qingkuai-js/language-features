import type { ScriptKind } from "typescript"
import type { RealPath } from "../../../../../types/common"
import type { ASTPositionWithFlag, SlotInfo } from "qingkuai/compiler"

import { QingKuaiSnapShot } from "../../snapshot"
import { projectService, snapshotCache } from "../../state"

// 增量更新qk文件ScriptInfo的内容
export function editQingKuaiScriptInfo(
    fileName: RealPath,
    content: string,
    itos: number[],
    slotInfo: SlotInfo,
    scriptKind: ScriptKind,
    positions: ASTPositionWithFlag[]
) {
    const oldSnapshot = snapshotCache.get(fileName)!
    const scriptInfo = projectService.getScriptInfo(fileName)!
    const newSnapshot = new QingKuaiSnapShot(content, false, scriptKind, itos, slotInfo, positions)

    const change = newSnapshot.getChangeRange(oldSnapshot)
    const changeStart = change.span.start
    scriptInfo.editContent(
        changeStart,
        changeStart + change.span.length,
        newSnapshot.getText(changeStart, changeStart + change.newLength)
    )

    newSnapshot.scriptKind = scriptKind
    newSnapshot.version = (oldSnapshot?.version || 0) + 1
    snapshotCache.set(fileName, newSnapshot ?? oldSnapshot)
}
