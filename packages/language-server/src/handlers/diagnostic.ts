import type { GetDiagnosticResultItem } from "../../../../types/communication"

import { getCompileResult } from "../compile"
import { debounce } from "../../../../shared-util/sundry"
import { getDiagnostic } from "qingkuai-language-service"
import { TP_HANDLERS } from "../../../../shared-util/constant"
import {
    tpic,
    Logger,
    documents,
    connection,
    isTestingEnv,
    limitedScriptLanguageFeatures
} from "../state"

export const publishDiagnostics = debounce(
    async (uri: string) => {
        const document = documents.get(uri)
        if (!document || isTestingEnv) {
            return null
        }

        try {
            const cr = await getCompileResult(document)
            const diagnostics = await getDiagnostic(cr, getScriptDiagnostics)
            connection.sendDiagnostics({ uri, diagnostics })
        } catch (err) {
            Logger.warn(`Publish diagnostics failed: ${err instanceof Error ? err.message : String(err)}`)
            connection.sendDiagnostics({ uri, diagnostics: [] })
        }
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

async function getScriptDiagnostics(fileName: string): Promise<GetDiagnosticResultItem[]> {
    if (limitedScriptLanguageFeatures) {
        return []
    }
    return await tpic.sendRequest<string, GetDiagnosticResultItem[]>(
        TP_HANDLERS.GetDiagnostic,
        fileName
    )
}
