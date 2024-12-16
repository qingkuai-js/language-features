import { tpic, Logger, setTpic, setTypeRefStatement, tpicConnectedResolver } from "./state"
import {
    communicationWayInfo,
    connectTsPluginServerFailed,
    connectTsPluginServerSuccess
} from "./messages"
import { pathToFileURL } from "url"
import { publishDiagnostics } from "./handlers/diagnostic"
import { connectTo } from "../../../shared-util/ipc/participant"

let connectTimes = 0

// vscode扩展加载完毕处理，连接到typescript-qingkuai-plugin的ipc服务器，并将客户端句柄
// 记录到tpic，后续qingkuai语言服务器将通过tpic与vscode内置的typescript语言服务进行通信
export async function connectTsServer(sockPath: string) {
    try {
        const client = await connectTo(sockPath)

        setTpic(client)
        attachClientHandlers()

        // 获取qingkuai类型检查器文件的本机绝对路径，qingkuai编译器在生成typescript中间代码时需要它
        setTypeRefStatement(await client.sendRequest("getQingkuaiDtsReferenceStatement", ""))

        tpicConnectedResolver()
        Logger.info(connectTsPluginServerSuccess)
        Logger.info(communicationWayInfo(sockPath))
    } catch {
        if (connectTimes++ < 60) {
            setTimeout(() => {
                connectTsServer(sockPath)
            }, 1000)
        } else {
            Logger.error(connectTsPluginServerFailed)
        }
    }
}

function attachClientHandlers() {
    // ts服务器插件日志通道
    const kinds = ["info", "warn", "error"] as const
    kinds.forEach(kind => {
        tpic.onNotification(`log/${kind}`, (msg: string) => {
            Logger[kind]("From typescript-qingkuai-plugin: " + msg)
        })
    })

    // ts插件主动推送的诊断通知
    tpic.onNotification("publishDiagnostics", (fileName: string) => {
        publishDiagnostics(pathToFileURL(fileName).toString())
    })
}
