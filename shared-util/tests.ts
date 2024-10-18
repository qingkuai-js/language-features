import type { DidOpenTextDocumentParams } from "vscode-languageserver/node"

import { connection } from "../tests/index.test"

// 将内容作为TextDocument打开并发送通知给语言服务器，此方法打开的文档uri为空字符串
export async function openContentAsTextDocument(content: string) {
    await connection.sendNotification("textDocument/didOpen", {
        textDocument: {
            uri: "",
            version: 0,
            text: content,
            languageId: ""
        }
    } satisfies DidOpenTextDocumentParams)
}
