import type { Range } from "vscode-languageserver"
import type { FindComponentTagRangeParams } from "../../../types/communication"

import {
    communicationWayInfo,
    connectTsPluginServerFailed,
    connectTsPluginServerSuccess
} from "./messages"
import { pathToFileURL } from "node:url"
import { getCompileRes, walk } from "./compile"
import { publishDiagnostics } from "./handlers/diagnostic"
import { ensureGetTextDocument } from "./handlers/document"
import { connectTo } from "../../../shared-util/ipc/participant"
import { tpic, Logger, setTpic, setTypeRefStatement, tpicConnectedResolver } from "./state"

let connectTimes = 0

// vscode扩展加载完毕处理，连接到typescript-plugin-qingkuai的ipc服务器，并将客户端句柄
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
            Logger[kind]("From typescript-plugin-qingkuai: " + msg)
        })
    })

    // ts插件主动推送的诊断通知
    tpic.onNotification("publishDiagnostics", (fileName: string) => {
        publishDiagnostics(pathToFileURL(fileName).toString())
    })

    tpic.onRequest<FindComponentTagRangeParams>(
        "findComponentTagRange",
        async ({ fileName, componentTag }) => {
            const ranges: Range[] = []
            const cr = await getCompileRes(ensureGetTextDocument(`file://${fileName}`))
            walk(cr.templateNodes, node => {
                if (node.componentTag === componentTag) {
                    ranges.push(cr.getRange(node.range[0], node.range[0] + node.tag.length + 1))
                }
            })
            return ranges
        }
    )
}
