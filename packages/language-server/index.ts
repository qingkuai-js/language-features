import util from "util"

import {
    createConnection,
    InitializeParams,
    ProposedFeatures,
    TextDocuments,
    TextDocumentSyncKind
} from "vscode-languageserver/node"
import { getLanguageService } from "vscode-html-languageservice"
import { TextDocument } from "vscode-languageserver-textdocument"
import { doComplete as doEmmetComplete } from "@vscode/emmet-helper"

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all)

// supports full document sync only
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)

const htmlLanguageService = getLanguageService()

connection.onInitialize((_params: InitializeParams) => {
    console.log("Keep output choice QingKuaiLanguageServer...")
    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Full,
            completionProvider: {
                triggerCharacters: [".", "+", "#", "*", ">", "]", ")", "^", "$", "@", "-"]
            }
        }
    }
})

connection.onCompletion(async params => {
    const document = documents.get(params.textDocument.uri)
    if (!document) {
        return null
    }

    const htmlDocument = htmlLanguageService.parseHTMLDocument(document)
    const offset = document.offsetAt(params.position)
    const htmlNode = htmlDocument.findNodeAt(offset)
    const htmlNodeStartTagEnd = htmlNode.startTagEnd ?? Infinity
    const htmlNodeEndTagStart = htmlNode.endTagStart ?? Infinity

    // emmet support
    if (!htmlNode.tag || (offset >= htmlNodeStartTagEnd && offset <= htmlNodeEndTagStart)) {
        return doEmmetComplete(document, params.position, "html", {})
    }

    // attribute support
    if (htmlNode.tag && offset > htmlNode.start && offset < htmlNodeStartTagEnd) {
        return htmlLanguageService.doComplete(document, params.position, htmlDocument)
    }
})

connection.onRequest("ok", params => {
    return {
        msg: `Received your msg: ${params.msg}`
    }
})

documents.listen(connection)
connection.listen()

function print(...values: any[]) {
    for (const value of values) {
        console.log(util.inspect(value, { depth: null }))
    }
}
