import type { Node as HTMLNode } from "vscode-html-languageservice"

import {
    createConnection,
    InitializeParams,
    ProposedFeatures,
    TextDocuments,
    TextDocumentSyncKind
} from "vscode-languageserver/node"
import { print } from "../../util/sundry"
import { offsetPosition } from "./util/vscode"
import { isUndefined } from "../../util/assert"
import { getLanguageService } from "vscode-html-languageservice"
import { TextDocument } from "vscode-languageserver-textdocument"
import { doComplete as doEmmetComplete } from "@vscode/emmet-helper"

const htmlLanguageService = getLanguageService()
const connection = createConnection(ProposedFeatures.all)
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)

documents.listen(connection)
connection.listen()

connection.onInitialize((_params: InitializeParams) => {
    console.log("Keep output choice QingKuaiLanguageServer...")
    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            completionProvider: {
                triggerCharacters: [".", "+", "#", "*", ">", "]", ")", "^", "$", "@", "-"]
            },
            documentFormattingProvider: {}
        }
    }
})

connection.onCompletion(async ({ position, textDocument }) => {
    const document = documents.get(textDocument.uri)
    if (!document) {
        return null
    }

    const htmlDocument = htmlLanguageService.parseHTMLDocument(document)
    const offset = document.offsetAt(position)
    const htmlNode = htmlDocument.findNodeAt(offset)
    print(htmlNode)
    if (inEmbeddedLang(htmlNode)) {
        return
    }

    const notInTag = isUndefined(htmlNode.tag)
    const htmlNodeStartTagEnd = htmlNode.startTagEnd ?? Infinity
    const htmlNodeEndTagStart = htmlNode.endTagStart ?? Infinity

    // emmet support
    if (notInTag || (offset > htmlNodeStartTagEnd && offset <= htmlNodeEndTagStart)) {
        const pre4Chars = document.getText({
            start: offsetPosition(position, 0, -4),
            end: position
        })
        if (pre4Chars !== "<!--") {
            return doEmmetComplete(document, position, "html", {})
        }
        connection.sendNotification("html/automaticallyCloseTag", "$0-->")
    }

    // attribute support
    if (!notInTag) {
        if (offset > htmlNode.start && offset < htmlNodeStartTagEnd) {
            return htmlLanguageService.doComplete(document, position, htmlDocument)
        } else if (offset === htmlNodeStartTagEnd && htmlNodeEndTagStart === Infinity) {
            connection.sendNotification(
                "html/automaticallyCloseTag",
                htmlLanguageService.doTagComplete(document, position, htmlDocument)
            )
        }
    }
})

documents.onDidChangeContent(document => {
    // console.log(document)
})

connection.onDocumentFormatting((params, token) => {
    return []
})

// check if current node in embedded language range
function inEmbeddedLang(node: HTMLNode): boolean {
    while (node.tag) {
        if (/^lang-/.test(node.tag)) {
            return true
        } else if (node.parent) {
            node = node.parent
        }
    }
    return false
}

function getCurrentLanguage(node: HTMLNode) {
    const tag = node.tag || ""
}
