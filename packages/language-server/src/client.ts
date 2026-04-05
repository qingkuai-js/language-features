import type {
    RetransmissionParams,
    ConnectToTsServerParams,
    FindComponentTagRangeParams
} from "../../../types/communication"
import type { GeneralFunc } from "../../../types/util"
import type { ComponentInfo } from "../../../types/common"

import prettier from "prettier"

import { URI } from "vscode-uri"
import { getCompileResultByPath } from "./compile"
import { publishDiagnostics } from "./handlers/diagnostic"
import { Messages, communicationWayInfo } from "./messages"
import { findComponentTagRanges } from "qingkuai-language-service"
import { LS_HANDLERS, TP_HANDLERS } from "../../../shared-util/constant"
import { generatePromiseAndResolver, sleep } from "../../../shared-util/sundry"
import { tpic, Logger, tpicConnectedResolver, setState, connection } from "./state"
import { connectTo, DEFAULT_PARTICIPANT } from "../../../shared-util/ipc/participant"

// 连接到typescript-plugin-qingkuai创建的ipc服务器，并将客户端句柄记录到tpic，后续qingkuai语言服务器将通过tpic与ts服务器进行通信
export async function connectTsServer(params: ConnectToTsServerParams) {
    let originalResolver: GeneralFunc | undefined = undefined
    if (params.isReconnect) {
        const promiseAndResolver = generatePromiseAndResolver()
        originalResolver = tpicConnectedResolver
        setState({
            tpic: DEFAULT_PARTICIPANT,
            typeDeclarationFilePath: "",
            projectKind: params.projectKind,
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
                projectKind: params.projectKind,
                limitedScriptLanguageFeatures: false
            })
            attachClientHandlers()
            attachRetransmissionHandlers()

            setState({
                typeDeclarationFilePath: await client.sendRequest(
                    TP_HANDLERS.getTypeDeclarationFilePath,
                    ""
                )
            })

            originalResolver?.()
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

export async function getComponentInfos(fileName: string, typePrintWidth = 80) {
    const componentInfos = await tpic.sendRequest<string, ComponentInfo[]>(
        TP_HANDLERS.GetComponentInfos,
        fileName
    )
    for (const info of componentInfos) {
        info.type = await prettier.format(info.type, {
            parser: "babel-ts",
            printWidth: typePrintWidth
        })
    }
    return componentInfos
}

function attachClientHandlers() {
    // typescript-plugin 日志通道
    tpic.onNotification("log", (msg: string) => {
        Logger.write(msg)
    })

    // ts插件主动推送的诊断通知
    tpic.onNotification(TP_HANDLERS.RefreshDiagnostic, (fileName: string) => {
        publishDiagnostics(URI.file(fileName).toString())
    })

    // tsserver 进程退出，多为 typescript.restartTsServer 命令调用
    tpic.onClose(() => connection.sendNotification(LS_HANDLERS.TsServerIsKilled, null))

    tpic.onRequest<FindComponentTagRangeParams>(
        TP_HANDLERS.FindComponentTagRange,
        async ({ fileName, componentTag }) => {
            return findComponentTagRanges(fileName, componentTag, getCompileResultByPath)
        }
    )
}

function attachRetransmissionHandlers() {
    // 事件转发，将 tpic 接受到的请求转发给 vscode 扩展客户端
    tpic.onRequest(TP_HANDLERS.Retransmission, async (params: RetransmissionParams) => {
        return await connection.sendRequest(params.name, params.data)
    })

    tpic.onNotification(TP_HANDLERS.Retransmission, async (params: RetransmissionParams) => {
        connection.sendNotification(params.name, params.data)
    })
}
