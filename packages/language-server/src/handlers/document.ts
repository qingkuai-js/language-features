import { clearDiagnostics, publishDiagnostics } from "./diagnostic"
import { documents, tpic, tpicConnectedPromise } from "../state"

export function attachDocumentHandlers() {
    documents.onDidChangeContent(({ document }) => {
        publishDiagnostics(document.uri)
    })

    documents.onDidOpen(async ({ document }) => {
        if (tpicConnectedPromise.state === "pending") {
            await tpicConnectedPromise
        }
        tpic.sendNotification("onDidOpen", document.uri)
    })

    documents.onDidClose(async ({ document }) => {
        if (tpicConnectedPromise.state === "pending") {
            await tpicConnectedPromise
        }
        clearDiagnostics(document.uri)
        tpic.sendNotification("onDidClose", document.uri)
    })
}
