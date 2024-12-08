import type { RetransmissionParams } from "../../../types/communication"

import { hover } from "./supports/hover"
import { connectTsServer } from "./client"
import { complete } from "./supports/complete"
import { initialize } from "./supports/initialize"
import { prepareRename, rename } from "./supports/rename"
import { publishDiagnostics } from "./supports/diagnostic"
import { connection, documents, tpic, tpicConnectedPromise } from "./state"

connection.onHover(hover)
connection.onCompletion(complete)
connection.onRenameRequest(rename)
connection.onInitialize(initialize)
connection.onPrepareRename(prepareRename)

connection.onRequest("ping", _ => "pong")
connection.onRequest("qingkuai/extensionLoaded", connectTsServer)

// 文档事件处理
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
    tpic.sendNotification("onDidClose", document.uri)
})

// 事件转发，将接受到的请求/通知转发给typescript插件的ipc服务器
connection.onRequest("qingkuai/retransmission", async (params: RetransmissionParams) => {
    if (tpicConnectedPromise.state === "pending") {
        await tpicConnectedPromise
    }
    return tpic.sendRequest(params.name, params.data)
})

connection.onNotification("qingkuai/retransmission", async (params: RetransmissionParams) => {
    if (tpicConnectedPromise.state === "pending") {
        await tpicConnectedPromise
    }
    tpic.sendNotification(params.name, params.data)
})
