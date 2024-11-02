import {
    Logger,
    documents,
    connection,
    getCompileRes,
    tsPluginClient,
    connectToTypescriptPluginServer
} from "./state"
import { hover } from "./supports/hover"
import { complete } from "./supports/complete"
import { diagnostic } from "./supports/diagnostic"
import { initialize } from "./supports/initialize"
import { prepareRename, rename } from "./supports/rename"
import { updateQingKuaiSnapshot, waitingUris } from "./supports/did-change"
import { connectTsPluginServerSuccess, connectTsPluginServerFailed } from "./messages"

connection.onHover(hover)
connection.onCompletion(complete)
connection.onRenameRequest(rename)
connection.onInitialize(initialize)
connection.onPrepareRename(prepareRename)

connection.onRequest("ping", _ => "pong")
connection.onRequest("textDocument/diagnostic", diagnostic)

// vscode扩展加载完毕通知，连接到typescript-qingkuai-plugin的ipc服务器
connection.onNotification("qingkuai/extensionLoaded", async function connect(times = 0) {
    try {
        await connectToTypescriptPluginServer()
        Logger.info(connectTsPluginServerSuccess)
        tsPluginClient.onMessage("connectDone", () => {
            waitingUris.forEach(uri => {
                const document = documents.get(uri)!
                const cr = getCompileRes(document)!
                updateQingKuaiSnapshot(uri, cr.code)
            })
        })
    } catch (err) {
        if (times < 60) {
            setTimeout(() => {
                connect(times + 1)
            }, 1000)
        } else {
            Logger.error(connectTsPluginServerFailed)
        }
    }
})
