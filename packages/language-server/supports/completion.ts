import type { CompletionHandler } from "../types/handlers"
import type { Node as HTMLNode } from "vscode-html-languageservice"

import { documents, connection } from "../state"
import { isUndefined } from "../../../util/shared/assert"
import { offsetPosition } from "../../../util/server/vscode"
import { getLanguageService } from "vscode-html-languageservice"
import { doComplete as doEmmetComplete } from "@vscode/emmet-helper"

export const completion: CompletionHandler = async ({ position, textDocument }) => {
    const htmlLanguageService = getLanguageService()
    const document = documents.get(textDocument.uri)
    if (!document) {
        return null
    }

    const htmlDocument = htmlLanguageService.parseHTMLDocument(document)
    const offset = document.offsetAt(position)
    const htmlNode = htmlDocument.findNodeAt(offset)
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
}

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
