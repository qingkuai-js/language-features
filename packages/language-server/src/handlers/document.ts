import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { getCompileRes } from "../compile"
import { TextDocument } from "vscode-languageserver-textdocument"
import { clearDiagnostics, publishDiagnostics } from "./diagnostic"
import { documents, tempDocuments, tpic, tpicConnectedPromise } from "../state"

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

export function ensureGetTextDocument(uri: string) {
    const existing = documents.get(uri)
    if (existing) {
        tempDocuments.delete(uri)
        return existing
    }

    const document = TextDocument.create(
        uri,
        "qingkuai",
        0,
        readFileSync(fileURLToPath(uri), "utf-8")
    )
    return tempDocuments.set(uri, document), document
}
