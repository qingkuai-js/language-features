import type { NumNumArray } from "../../../../../types/common"
import type { ASTPosition, ASTPositionWithFlag } from "qingkuai/compiler"
import type { UpdateSnapshotParams } from "../../../../../types/communication"

import { fileURLToPath } from "url"
import { updateQingkuaiSnapshot } from "./snapshot"
import { refreshDiagnostics } from "../diagnostic/refresh"
import { isUndefined } from "../../../../../shared-util/assert"
import { openQingkuaiFiles, projectService, server, snapshotCache, ts } from "../../state"

export function attachDocumentManager() {
    server.onNotification("onDidOpen", (uri: string) => {
        const fileName = fileURLToPath(uri)
        openQingkuaiFiles.add(fileName)
        projectService.openClientFile(fileName)
    })

    server.onNotification("onDidClose", (uri: string) => {
        const fileName = fileURLToPath(uri)
        openQingkuaiFiles.delete(fileName)
        projectService.closeClientFile(fileName)
    })
}

export function attachUpdateSnapshot() {
    server.onRequest<UpdateSnapshotParams>("updateSnapshot", ({ fileName, ...rest }) => {
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

// 恢复被压缩的positions信息
function recoverPositions(cp: NumNumArray) {
    return cp.reduce((ret, [value, count]) => {
        return ret.concat(
            Array.from({ length: count }, (_, i) => {
                return {
                    column: i,
                    line: value,
                    index: ret.length + i
                }
            })
        )
    }, [] as ASTPosition[])
}

// 恢复被压缩的itos信息
function recoverItos(citos: NumNumArray) {
    return citos.reduce((ret, [value, count]) => {
        if (value === -1) {
            return ret.concat(Array(count).fill(value))
        }
        for (let i = count - 1; i >= 0; i--) {
            ret.push(value - i)
        }
        return ret
    }, [] as number[])
}

// 恢复被压缩的positionFlag信息
function recoverPostionFlags(cpf: NumNumArray) {
    return cpf.reduce((ret, [value, count]) => {
        return ret.concat(Array(count).fill(value))
    }, [] as number[])
}
