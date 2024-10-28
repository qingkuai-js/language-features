import { hover } from "./supports/hover"
import { connection, connectToTypescriptPluginServer, Logger, tsPluginClient } from "./state"
import { complete } from "./supports/complete"
import { diagnostic } from "./supports/diagnostic"
import { initialize } from "./supports/initialize"
import { prepareRename, rename } from "./supports/rename"

connection.onHover(hover)
connection.onCompletion(complete)
connection.onRenameRequest(rename)
connection.onInitialize(initialize)
connection.onPrepareRename(prepareRename)

connection.onRequest("ping", _ => "pong")
connection.onRequest("textDocument/diagnostic", diagnostic)

// vscode扩展加载完毕通知，连接到typescript-qingkuai-plugin的ipc服务器
connection.onNotification("qingkuai/extensionLoaded", function connect(times = 0) {
    setTimeout(async () => {
        try {
            await connectToTypescriptPluginServer()
            Logger.info("Connect to typescript-qingkuai-plugin ipc server successfully.")
            tsPluginClient.send("test", "just a test...")
        } catch (err) {
            if (times < 60) {
                connect(times + 1)
            } else {
                Logger.error(
                    "Failed to connect to typescript-qingkuai-plugin ipc server within one minute, please check if the vscode built-in typescript-language-features extension is enabled."
                )
            }
        }
    }, 1000)
})
