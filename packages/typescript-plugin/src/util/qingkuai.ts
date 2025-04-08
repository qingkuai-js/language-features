import type { RealPath } from "../../../../types/common"

import { Messages } from "../message"
import { compile } from "qingkuai/compiler"
import { QingKuaiSnapShot } from "../snapshot"
import { existsSync, readFileSync } from "node:fs"
import { ts, Logger, snapshotCache } from "../state"
import { debugAssert } from "../../../../shared-util/assert"
import { getScriptKindKey } from "../../../../shared-util/qingkuai"
import { typeRefStatement } from "qingkuai-language-service/adapters"

export function compileQingkuaiFileToInterCode(path: RealPath) {
    debugAssert(existsSync(path))

    try {
        return compile(readFileSync(path, "utf-8")!, {
            check: true,
            typeRefStatement
        })
    } catch (error: any) {
        Logger.error(Messages.UnexpectedCompilerError)
        process.exit(1)
    }
}

export function ensureGetSnapshotOfQingkuaiFile(fileName: RealPath) {
    if (snapshotCache.has(fileName)) {
        return snapshotCache.get(fileName)!
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
            compileRes.inputDescriptor.slotInfo,
            compileRes.inputDescriptor.positions
        )
    )

    return snapshotCache.get(fileName)!
}
