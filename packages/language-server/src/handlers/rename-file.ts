import type { RenameFileResult, RenameFileParams } from "../../../../types/communication"

import { LS_HANDLERS, TP_HANDLERS } from "../../../../shared-util/constant"
import { connection, limitedScriptLanguageFeatures, tpic, tpicConnectedPromise } from "../state"

export async function renameFile(params: RenameFileParams) {
    if (limitedScriptLanguageFeatures) {
        return null
    }

    if (tpicConnectedPromise.state === "pending") {
        await tpicConnectedPromise
    }

    connection.sendNotification(
        LS_HANDLERS.ApplyWorkspaceEdit,
        await tpic.sendRequest<RenameFileParams, RenameFileResult>(TP_HANDLERS.RenameFile, params)
    )
}
