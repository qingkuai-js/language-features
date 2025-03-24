import type { WorkspaceEdit } from "vscode-languageserver/node"
import type {
    RenameFileParams,
    ApplyWorkspaceEditParams,
    RenameFileResult
} from "../../../../types/communication"

import { URI } from "vscode-uri"
import { TextEdit } from "vscode-languageserver/node"
import { LSHandler, TPICHandler } from "../../../../shared-util/constant"
import { connection, limitedScriptLanguageFeatures, tpic, tpicConnectedPromise } from "../state"

export async function renameFile(params: RenameFileParams) {
    if (limitedScriptLanguageFeatures) {
        return null
    }

    if (tpicConnectedPromise.state === "pending") {
        await tpicConnectedPromise
    }

    const workspaceEdit: WorkspaceEdit = { changes: {} }
    const res = await tpic.sendRequest<RenameFileParams, RenameFileResult>(
        TPICHandler.RenameFile,
        params
    )
    for (const item of res) {
        workspaceEdit.changes![URI.file(item.fileName).toString()] = item.changes.map(change => {
            return TextEdit.replace(change.range, change.newText)
        })
    }
    if (Object.keys(workspaceEdit.changes || {}).length) {
        connection.sendNotification(LSHandler.ApplyWorkspaceEdit, {
            edit: workspaceEdit,
            isRefactoring: true,
            message: "Qingkuai: imports changes is being applied"
        } satisfies ApplyWorkspaceEditParams)
    }
}
