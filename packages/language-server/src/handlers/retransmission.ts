import type { RetransmissionParams } from "../../../../types/communication"

import { connection, tpic, tpicConnectedPromise } from "../state"
import { LSHandler, TPICHandler } from "../../../../shared-util/constant"

export async function attachRetransmissionHandlers() {
    // 事件转发，将接受到的请求/通知转发给typescript插件的ipc服务器
    connection.onRequest(LSHandler.Retransmission, async (params: RetransmissionParams) => {
        if (tpicConnectedPromise.state === "pending") {
            await tpicConnectedPromise
        }
        return tpic.sendRequest(params.name, params.data)
    })

    connection.onNotification(LSHandler.Retransmission, async (params: RetransmissionParams) => {
        if (tpicConnectedPromise.state === "pending") {
            await tpicConnectedPromise
        }
        tpic.sendNotification(params.name, params.data)
    })
}
