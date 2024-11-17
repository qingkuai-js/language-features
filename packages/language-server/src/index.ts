import { hover } from "./supports/hover"
import { connectTsServer } from "./client"
import { complete } from "./supports/complete"
import { initialize } from "./supports/initialize"
import { prepareRename, rename } from "./supports/rename"
import { connection, documents, tpic, tpicConnectedPromise } from "./state"
import { publishDiagnostics } from "./supports/diagnostic"

connection.onHover(hover)
connection.onCompletion(complete)
connection.onRenameRequest(rename)
connection.onInitialize(initialize)
connection.onPrepareRename(prepareRename)

connection.onRequest("ping", _ => "pong")
connection.onRequest("qingkuai/extensionLoaded", connectTsServer)

// 文档事件处理
documents.onDidChangeContent(({ document }) => publishDiagnostics(document.uri))

documents.onDidOpen(async ({ document }) => {
    await tpicConnectedPromise, tpic.sendNotification("onDidOpen", document.uri)
})

documents.onDidClose(async ({ document }) => {
    await tpicConnectedPromise, tpic.sendNotification("onDidClose", document.uri)
})
