import nodeFs from "node:fs"
import nodeUrl from "node:url"

import { cachedDocuments, documents } from "./state"
import { TextDocument } from "vscode-languageserver-textdocument"

export function ensureGetTextDocument(uri: string) {
    const existing = documents.get(uri)
    if (existing) {
        return (cachedDocuments.set(uri, existing), existing)
    }

    const document = TextDocument.create(
        uri,
        "qingkuai",
        0,
        nodeFs.readFileSync(nodeUrl.fileURLToPath(uri), "utf-8")
    )
    return (cachedDocuments.set(uri, document), document)
}
