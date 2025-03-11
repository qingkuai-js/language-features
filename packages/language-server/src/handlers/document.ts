import { getCompileRes } from "../compile"
import { documents, tpic, tpicConnectedPromise } from "../state"
import { clearDiagnostics, publishDiagnostics } from "./diagnostic"

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
        await getCompileRes(document)
        clearDiagnostics(document.uri)
        tpic.sendNotification("onDidClose", document.uri)
    })
}
