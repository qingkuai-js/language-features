import type { IpcParticipant } from "../../../../shared-util/ipc/types"

import { existsSync } from "node:fs"
import { forEachProject } from "../util/typescript"
import { runAll } from "../../../../shared-util/sundry"
import { TPICHandler } from "../../../../shared-util/constant"
import { isQingkuaiFileName } from "../../../../shared-util/assert"
import { createServer } from "../../../../shared-util/ipc/participant"
import { ensureGetSnapshotOfQingkuaiFile, getRealPath } from "../util/qingkuai"
import { lsProjectKindChanged, setState, ts, typeRefStatement } from "../state"

import { attachHoverTip } from "./hover"
import { attachCodeLens } from "./code-lens"
import { attachWaitCommand } from "./command"
import { attachRenameFile } from "./rename-file"
import { attachGetCompletion } from "./complete"
import { attachFindReference } from "./reference"
import { attachFindDefinition } from "./definition"
import { attachGetSignatureHelp } from "./signature"
import { attachFindImplementation } from "./implementation"
import { attachChangeConfig } from "./configuration/handler"
import { attachPrepareRename, attachRename } from "./rename"
import { attachGetDiagnostic, attachRefreshDiagnostic } from "./diagnostic/handler"
import { attachDocumentManager, attachGetLanguageId, attachUpdateSnapshot } from "./content/handler"

export function attachLanguageServerIPCHandlers() {
    runAll([
        attachRename,
        attachHoverTip,
        attachCodeLens,
        attachRenameFile,
        attachWaitCommand,
        attachChangeConfig,
        attachGetLanguageId,
        attachFindReference,
        attachGetDiagnostic,
        attachPrepareRename,
        attachGetCompletion,
        attachUpdateSnapshot,
        attachFindDefinition,
        attachDocumentManager,
        attachGetSignatureHelp,
        attachRefreshDiagnostic,
        attachFindImplementation
    ])
}

// 创建ipc通道，并监听来自qingkuai语言服务器的请求
export function createIpcServer(sockPath: string) {
    if (!existsSync(sockPath)) {
        createServer(sockPath).then(server => {
            setState({ server })
            attachLanguageServerIPCHandlers()
            ensureLanguageServerProjectKind(server)
            server.onRequest(TPICHandler.GetTypeRefStatement, () => typeRefStatement)
        })
    }
}

export function ensureLanguageServerProjectKind(server: IpcParticipant) {
    forEachProject(p => {
        if (lsProjectKindChanged) {
            return
        }

        for (const fileName of p.getFileNames()) {
            const realPath = getRealPath(fileName)
            if (!isQingkuaiFileName(realPath || "")) {
                continue
            }

            const qingkuaiSnapshot = ensureGetSnapshotOfQingkuaiFile(realPath!)
            if (qingkuaiSnapshot.scriptKind === ts.ScriptKind.TS) {
                setState({
                    lsProjectKindChanged: true
                })
                server.sendNotification(TPICHandler.InfferedProjectAsTypescript, null)
                break
            }
        }
    })
}
