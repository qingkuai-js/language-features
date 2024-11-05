import fs from "fs"
import { hover } from "./supports/hover"
import { complete } from "./supports/complete"
import { inspect } from "../../../shared-util/log"
import { diagnostic } from "./supports/diagnostic"
import { initialize } from "./supports/initialize"
import { connectTo } from "../../../shared-util/ipc"
import { prepareRename, rename } from "./supports/rename"
import { getSockPath } from "../../../shared-util/ipc/sock"
import { Logger, connection, setTipc, tpic } from "./state"
import { connectTsPluginServerSuccess, connectTsPluginServerFailed } from "./messages"

connection.onHover(hover)
connection.onCompletion(complete)
connection.onRenameRequest(rename)
connection.onInitialize(initialize)
connection.onPrepareRename(prepareRename)

connection.onRequest("ping", _ => "pong")
connection.onRequest("textDocument/diagnostic", diagnostic)

// vscode扩展加载完毕，连接到typescript-qingkuai-plugin的ipc服务器，并将客户端句柄记录到tpic
// 后续qingkuai语言服务器将通过tpic与vscode内置的typescript语言服务进行通信，此外此方法还会创建一个
// 用于qingkuai-typescript-plugin调试日志的处理方法(onNotification)并通过语言服务器的Logger输出
connection.onNotification("qingkuai/extensionLoaded", async function connect(times = 0) {
    if (fs.existsSync(getSockPath("qingkuai"))) {
        setTipc(await connectTo("qingkuai"))
        const kinds = ["info", "warn", "error"] as const
        kinds.forEach(kind => {
            tpic.onNotification(`log/${kind}`, (msg: string) => {
                Logger[kind]("From typescript-qingkuai-plugin: " + msg)
            })
        })
        Logger.info(connectTsPluginServerSuccess)
    } else if (times < 60) {
        setTimeout(() => {
            connect(times + 1)
        }, 1000)
    } else {
        Logger.error(connectTsPluginServerFailed)
    }
})
