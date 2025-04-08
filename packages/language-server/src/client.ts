import type {
    RetransmissionParams,
    ConnectToTsServerParams,
    FindComponentTagRangeParams
} from "../../../types/communication"

import { URI } from "vscode-uri"
import { ProjectKind } from "./constants"
import { getCompileResByPath } from "./compile"
import { publishDiagnostics } from "./handlers/diagnostic"
import { Messages, communicationWayInfo } from "./messages"
import { findComponentTagRanges } from "qingkuai-language-service"
import { LSHandler, TPICHandler } from "../../../shared-util/constant"
import { generatePromiseAndResolver, sleep } from "../../../shared-util/sundry"
import { tpic, Logger, tpicConnectedResolver, setState, connection } from "./state"
import { connectTo, defaultParticipant } from "../../../shared-util/ipc/participant"

// 连接到typescript-plugin-qingkuai创建的ipc服务器，并将客户端句柄记录到tpic，后续qingkuai语言服务器将通过tpic与ts服务器进行通信
export async function connectTsServer(params: ConnectToTsServerParams) {
    if (params.isReconnect) {
        const promiseAndResolver = generatePromiseAndResolver()
        setState({
            typeRefStatement: "",
            tpic: defaultParticipant,
            projectKind: ProjectKind.JS,
            tpicConnectedPromise: promiseAndResolver[0],
            tpicConnectedResolver: promiseAndResolver[1]
        })
        Logger.info(Messages.WaitForReconnectTsServer, true)
    }

    for (let connectTimes = 0; connectTimes < 60; connectTimes++) {
        try {
            const client = await connectTo(params.sockPath)
            setState({
                tpic: client,
                limitedScriptLanguageFeatures: false
            })
            attachClientHandlers()
            attachRetransmissionHandlers()

            // 获取qingkuai类型三斜线引用指令语句，qingkuai编译器在生成typescript中间代码时需要它
            setState({
                typeRefStatement: await client.sendRequest(TPICHandler.GetTypeRefStatement, "")
            })

            tpicConnectedResolver()
            Logger.info(Messages.ConnectTsServerPluginSuccess)
            Logger.info(communicationWayInfo(params.sockPath))
            return null
        } catch {
            await sleep(1000)
            continue
        }
    }

    Logger.error(Messages.ConnectTsServerPluginFailed)
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

    // ts server进程退出，多为typescript.restartTsServer命令调用
    tpic.onClose(() => connection.sendNotification(LSHandler.TsServerIsKilled, null))

    tpic.onRequest<FindComponentTagRangeParams>(
        TPICHandler.FindComponentTagRange,
        async ({ fileName, componentTag }) => {
            return findComponentTagRanges(fileName, componentTag, getCompileResByPath)
        }
    )
}

function attachRetransmissionHandlers() {
    // 事件转发，将tpic接受到的请求转发给vscode扩展客户端
    tpic.onRequest(TPICHandler.Retransmission, async (params: RetransmissionParams) => {
        return await connection.sendRequest(params.name, params.data)
    })

    tpic.onNotification(TPICHandler.Retransmission, async (params: RetransmissionParams) => {
        connection.sendNotification(params.name, params.data)
    })
}
