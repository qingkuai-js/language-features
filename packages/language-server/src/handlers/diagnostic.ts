import type { GetDiagnosticResultItem } from "../../../../types/communication"

import { getCompileRes } from "../compile"
import { RealPath } from "../../../../types/common"
import { debounce } from "../../../../shared-util/sundry"
import { getDiagnostic } from "qingkuai-language-service"
import { LSHandler, TPICHandler } from "../../../../shared-util/constant"
import { tpic, documents, connection, isTestingEnv, limitedScriptLanguageFeatures } from "../state"

export const publishDiagnostics = debounce(
    async (uri: string) => {
        const document = documents.get(uri)
        if (!document || isTestingEnv) {
            return null
        }

        const cr = await getCompileRes(document)
        const diagnostics = getDiagnostic(cr, getScriptDiagnostics)
        connection.sendNotification(LSHandler.PublishDiagnostic, { uri, diagnostics })
    },
    300,
    debounceIdGetter
)

// 清空诊断信息
export function clearDiagnostics(uri: string) {
    connection.sendNotification("textDocument/publishDiagnostics", {
        uri,
        diagnostics: []
    })
}

function debounceIdGetter(uri: string) {
    return uri
}

async function getScriptDiagnostics(fileName: RealPath): Promise<GetDiagnosticResultItem[]> {
    if (limitedScriptLanguageFeatures) {
        return []
    }
    return await tpic.sendRequest<string, GetDiagnosticResultItem[]>(
        TPICHandler.GetDiagnostic,
        fileName
    )
}
