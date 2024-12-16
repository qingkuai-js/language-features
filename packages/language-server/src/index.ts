import type { RetransmissionParams } from "../../../types/communication"

import { hover } from "./handlers/hover"
import { connectTsServer } from "./client"
import { clearConfigCache } from "./compile"
import { complete } from "./handlers/complete"
import { initialize } from "./handlers/initialize"
import { prepareRename, rename } from "./handlers/rename"
import { publishDiagnostics } from "./handlers/diagnostic"
import { attachDocumentHandlers } from "./handlers/document"
import { connection, tpic, tpicConnectedPromise } from "./state"

attachDocumentHandlers()

connection.onRequest("ping", _ => "pong")

connection.onHover(hover)
connection.onCompletion(complete)
connection.onRenameRequest(rename)
connection.onInitialize(initialize)
connection.onPrepareRename(prepareRename)

connection.onCompletionResolve((params, token) => {
    return params
})

// 自定义事件处理
connection.onRequest("qingkuai/extensionLoaded", connectTsServer)
connection.onNotification("qingkuai/publishDiagnostics", publishDiagnostics)
connection.onNotification("qingkuai/updateExtensionConfig", clearConfigCache)

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
