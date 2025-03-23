import { ProjectKind } from "./constants"
import type { Range } from "vscode-languageserver"
import type { FindComponentTagRangeParams } from "../../../types/communication"

import {
    communicationWayInfo,
    connectTsPluginServerFailed,
    connectTsPluginServerSuccess
} from "./messages"
import { URI } from "vscode-uri"
import { getCompileRes, walk } from "./compile"
import { publishDiagnostics } from "./handlers/diagnostic"
import { TPICHandler } from "../../../shared-util/constant"
import { ensureGetTextDocument } from "./handlers/document"
import { connectTo } from "../../../shared-util/ipc/participant"
import { tpic, Logger, tpicConnectedResolver, setState } from "./state"

let connectTimes = 0

// vscode扩展加载完毕处理，连接到typescript-plugin-qingkuai的ipc服务器，并将客户端句柄
// 记录到tpic，后续qingkuai语言服务器将通过tpic与vscode内置的typescript语言服务进行通信
export async function connectTsServer(sockPath: string) {
    try {
        const client = await connectTo(sockPath)

        setState({
            tpic: client
        })
        attachClientHandlers()

        // 获取qingkuai类型检查器文件的本机绝对路径，qingkuai编译器在生成typescript中间代码时需要它
        setState({
            typeRefStatement: await client.sendRequest("getQingkuaiDtsReferenceStatement", "")
        })

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

    // 将项目视为tyepscript项目，在自动添加script标签时会优先使用<lang-ts>
    tpic.onNotification(TPICHandler.InfferedProjectAsTypescript, () => {
        setState({ projectKind: ProjectKind.TS })
    })

    // ts插件主动推送的诊断通知
    tpic.onNotification(TPICHandler.RefreshDiagnostic, (fileName: string) => {
        publishDiagnostics(URI.file(fileName).toString())
    })

    tpic.onRequest<FindComponentTagRangeParams>(
        TPICHandler.FindComponentTagRange,
        async ({ fileName, componentTag }) => {
            const ranges: Range[] = []
            const uri = URI.file(fileName).toString()
            const cr = await getCompileRes(ensureGetTextDocument(uri))
            walk(cr.templateNodes, node => {
                if (node.componentTag === componentTag) {
                    ranges.push(cr.getRange(node.range[0], node.range[0] + node.tag.length + 1))
                }
            })
            return ranges
        }
    )
}
