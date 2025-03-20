import type { WorkspaceEdit } from "vscode-languageserver/node"
import type {
    RenameFileParams,
    ApplyWorkspaceEditParams,
    RenameFileResult
} from "../../../../types/communication"

import { TextEdit } from "vscode-languageserver/node"
import { connection, tpic, tpicConnectedPromise } from "../state"
import { LSHandler, TPICHandler } from "../../../../shared-util/constant"

export async function renameFile(params: RenameFileParams) {
    if (tpicConnectedPromise.state === "pending") {
        await tpicConnectedPromise
    }

    const workspaceEdit: WorkspaceEdit = { changes: {} }
    const res = await tpic.sendRequest<RenameFileParams, RenameFileResult>(
        TPICHandler.renameFile,
        params
    )
    for (const item of res) {
        workspaceEdit.changes![`file://${item.fileName}`] = item.changes.map(change => {
            return TextEdit.replace(change.range, change.newText)
        })
    }
    if (Object.keys(workspaceEdit.changes || {}).length) {
        connection.sendNotification(LSHandler.applyWorkspaceEdit, {
            edit: workspaceEdit,
            isRefactoring: true,
            message: "Qingkuai: imports changes is being applied"
        } satisfies ApplyWorkspaceEditParams)
    }
}
