import { URI } from "vscode-uri"

import {
    tpic,
    Logger,
    setState,
    documents,
    connection,
    tpicConnectedPromise,
    workspaceReadyNotified
} from "../state"
import { Messages } from "../messages"
import { getCompileResult } from "../compile"
import { clearDiagnostics, publishDiagnostics } from "./diagnostic"
import { TP_HANDLERS, LS_HANDLERS } from "../../../../shared-util/constant"

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

            if (!workspaceReadyNotified) {
                Logger.info(Messages.WorkspaceReady)
                setState({ workspaceReadyNotified: true })
                connection.sendNotification(LS_HANDLERS.WorkspaceReady, null)
            }
        } catch (err) {
            Logger.warn(
                `DidOpen handling failed: ${err instanceof Error ? err.message : String(err)}`
            )
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
