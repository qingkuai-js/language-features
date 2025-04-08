import { TPICHandler } from "../../../../shared-util/constant"
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
        tpic.sendNotification(TPICHandler.DidOpen, document.uri)
    })

    documents.onDidClose(async ({ document }) => {
        if (tpicConnectedPromise.state === "pending") {
            await tpicConnectedPromise
        }
        clearDiagnostics(document.uri)
        tpic.sendNotification(TPICHandler.DidClose, document.uri)
    })
}


