import { URI } from "vscode-uri"

import { getCompileResult } from "../compile"
import { TP_HANDLERS } from "../../../../shared-util/constant"
import { Logger, documents, tpic, tpicConnectedPromise } from "../state"
import { clearDiagnostics, publishDiagnostics } from "./diagnostic"

export function attachDocumentHandlers() {
    documents.onDidChangeContent(({ document }) => {
        publishDiagnostics(document.uri)
    })

    documents.onDidOpen(async ({ document }) => {
        try {
            if (tpicConnectedPromise.state === "pending") {
                await tpicConnectedPromise
            }
            await tpic.sendRequest(TP_HANDLERS.DidOpen, URI.parse(document.uri).fsPath)
            await getCompileResult(document)
        } catch (err) {
            Logger.warn(`DidOpen handling failed: ${err instanceof Error ? err.message : String(err)}`)
        }
    })

    documents.onDidClose(async ({ document }) => {
        if (tpicConnectedPromise.state === "pending") {
            await tpicConnectedPromise
        }
        clearDiagnostics(document.uri)
        tpic.sendNotification(TP_HANDLERS.DidClose, URI.parse(document.uri).fsPath)
    })
}
