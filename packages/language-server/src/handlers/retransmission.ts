import type { RetransmissionParams } from "../../../../types/communication"

import { connection, tpic, tpicConnectedPromise } from "../state"

export function attachRetransmissionHandlers() {
    // 事件转发，将tpic接受到的请求转发给vscode扩展客户端
    tpic.onRequest("retransmission", async (params: RetransmissionParams) => {
        return await connection.sendRequest(params.name, params.data)
    })

    tpic.onNotification("retransmission", async (params: RetransmissionParams) => {
        connection.sendNotification(params.name, params.data)
    })

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
}
