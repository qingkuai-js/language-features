import type {
    RenameFileResult,
    RenameFileParams,
    ApplyWorkspaceEditParams
} from "../../../../types/communication"
import type { WorkspaceEdit } from "vscode-languageserver/node"

import { TextEdit } from "vscode-languageserver/node"
import { connection, tpic, tpicConnectedPromise } from "../state"
import { LSHandler, TPICHandler } from "../../../../shared-util/constant"

export async function renameFile(params: RenameFileParams) {
    await tpicConnectedPromise
    const res = await tpic.sendRequest<RenameFileParams, RenameFileResult>(
        TPICHandler.renameFile,
        params
    )

    const fileNames = Object.keys(res)
    const workspaceEdit: WorkspaceEdit = {
        changes: {}
    }
    fileNames.forEach(fileName => {
        const uri = `file://${fileName}`
        workspaceEdit.changes![uri] = res[fileName].map(item => {
            return TextEdit.replace(item.range, item.newText)
        })
    })
    if (fileNames.length) {
        connection.sendNotification(LSHandler.applyWorkspaceEdit, {
            edit: workspaceEdit,
            isRefactoring: true,
            message: "Qingkuai: imports changes is being applied"
        } satisfies ApplyWorkspaceEditParams)
    }
}
