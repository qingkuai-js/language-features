import type { RenameFileResult, RenameFileParams } from "../../../../types/communication"

import { TP_HANDLERS } from "../../../../shared-util/constant"
import { tpic, limitedScriptLanguageFeatures, tpicConnectedPromise } from "../state"

export async function renameFile(params: RenameFileParams): Promise<RenameFileResult> {
    if (limitedScriptLanguageFeatures) {
        return []
    }

    if (tpicConnectedPromise.state === "pending") {
        await tpicConnectedPromise
    }

    return await tpic.sendRequest<RenameFileParams, RenameFileResult>(TP_HANDLERS.RenameFile, params)
}
