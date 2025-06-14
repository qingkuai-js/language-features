import type {
    SocketHandlers,
    IpcParticipant,
    OnRequestMethod,
    RequestResolvers,
    SendRequestMethod,
    OnNotificationMethod,
    SendNotificationMethod
} from "./types"
import type { Socket } from "net"
import type { GeneralFunc } from "../../types/util"

import net from "net"
import { NOOP } from "../constant"
import { getReleaseId, releaseId } from "./id"
import { isUndefined, isPromise } from "../assert"
import { createMessageBuffer, createBufferReader } from "./buffer"

export const defaultParticipant: IpcParticipant = {
    close: NOOP,
    onClose: NOOP,
    onRequest: NOOP,
    sendRequest: NOOP,
    onNotification: NOOP,
    sendNotification: NOOP
}

export function createServer(sockPath: string) {
    const handlers = new Map<string, GeneralFunc>()
    const resolvers = new Map<string, GeneralFunc>()
    return new Promise<IpcParticipant>((resolve, reject) => {
        const server = net.createServer(socket => {
            resolve(newParticipant(socket, handlers, resolvers, "server"))
        })
        server.listen(sockPath)
        server.on("error", err => reject(err))
    })
}

export function connectTo(sockPath: string) {
    const handlers = new Map<string, GeneralFunc>()
    const resolvers = new Map<string, GeneralFunc>()
    return new Promise<IpcParticipant>((resolve, reject) => {
        const client = net.createConnection(sockPath, () => {
            resolve(newParticipant(client, handlers, resolvers, "client"))
        })
        client.on("error", err => reject(err))
    })
}

function newParticipant(
    socket: Socket,
    handlers: SocketHandlers,
    resolvers: RequestResolvers,
    type: "server" | "client"
): IpcParticipant {
    const reader = createBufferReader()
    const onRequest: OnRequestMethod = setHandler
    const sendNotification: SendNotificationMethod = send
    const onNotification: OnNotificationMethod = setHandler

    const sendRequest: SendRequestMethod = (name, params) => {
        const requestId = type[0] + getReleaseId()
        send(name, params, requestId)
        return new Promise(resolve => {
            resolvers.set(requestId, resolve)
        })
    }

    socket.setNoDelay(true)
    socket.on("data", buffer => {
        reader.read(buffer, ({ messageId, methodName, body }) => {
            const resolver = resolvers.get(messageId)
            if (!isUndefined(resolver)) {
                resolver(body)
                resolvers.delete(messageId)
                releaseId(parseInt(messageId.slice(1)))
                return
            }

            const response = handlers.get(methodName)?.(body)
            if (!messageId) {
                return
            }

            const back = (res: any) => send("", res, messageId)
            isPromise(response) ? response.then(back) : back(response)
        })
    })

    function onClose(callback: () => void) {
        socket.on("close", callback)
    }

    function send(name: string, data: any, id = "") {
        socket.write(createMessageBuffer(data, name, id))
    }

    function setHandler(name: string, handler: GeneralFunc) {
        handlers.set(name, handler)
    }

    return {
        onClose,
        onRequest,
        sendRequest,
        onNotification,
        sendNotification,
        close: socket.end
    }
}
