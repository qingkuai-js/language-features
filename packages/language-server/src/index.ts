import type { RetransmissionParams } from "../../../types/communication"

import { hover } from "./supports/hover"
import { connectTsServer } from "./client"
import { complete } from "./supports/complete"
import { initialize } from "./supports/initialize"
import { prepareRename, rename } from "./supports/rename"
import { clearDiagnostics, publishDiagnostics } from "./supports/diagnostic"
import { connection, documents, setConfiguration, tpic, tpicConnectedPromise } from "./state"

connection.onRequest("ping", _ => "pong")

connection.onHover(hover)
connection.onCompletion(complete)
connection.onRenameRequest(rename)
connection.onInitialize(initialize)
connection.onPrepareRename(prepareRename)

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
    clearDiagnostics(document.uri)
    tpic.sendNotification("onDidClose", document.uri)
})

// 自定义事件处理
connection.onRequest("qingkuai/extensionLoaded", connectTsServer)
connection.onNotification("qingkuai/publishDiagnostics", publishDiagnostics)
connection.onNotification("qingkuai/updateExtensionConfig", v => setConfiguration(v))

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
