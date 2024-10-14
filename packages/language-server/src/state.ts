import type { CachedCompileResultItem } from "./types/service"

import {
    TextDocuments,
    createConnection,
    ProposedFeatures,
    TextDocumentIdentifier
} from "vscode-languageserver/node"
import { compile } from "qingkuai/compiler"
import { isUndefined } from "../../../shared-util/assert"
import { TextDocument } from "vscode-languageserver-textdocument"

export const documents = new TextDocuments(TextDocument)
export const connection = createConnection(ProposedFeatures.all)

// crc means Compile Result Cache
// 避免多个客户端事件可能会导致频繁编译，crc缓存最新版本的编译结果
export const crc = new Map<string, CachedCompileResultItem>()

// 解析qk源码文件，版本相同时不会重复解析
export function getCompileRes(document: TextDocument | TextDocumentIdentifier | undefined) {
    if (document && !("languageId" in document)) {
        document = documents.get(document.uri)
    }

    if (isUndefined(document)) return

    const typedDocument = document as TextDocument
    const { version, uri } = typedDocument
    const cached = crc.get(uri)
    if (version !== cached?.version) {
        const source = typedDocument.getText()
        const res = {
            source,
            version,
            ...compile(source, {
                componentName: "",
                check: true
            })
        }
        crc.set(uri, res)
        return res
    }
    return cached
}

connection.listen()
documents.listen(connection)
