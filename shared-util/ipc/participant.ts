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
import { noop } from "../constant"
import { getReleaseId, releaseId } from "./id"
import { isUndefined, isPromise } from "../assert"
import { createMessageBuffer, createBufferReader } from "./buffer"

export const defaultParticipant: IpcParticipant = {
    close: noop,
    onRequest: noop,
    sendRequest: noop,
    onNotification: noop,
    sendNotification: noop
}

export function createServer(sockPath: string) {
    const handlers = new Map<string, GeneralFunc>()
    const resolvers = new Map<number, GeneralFunc>()
    return new Promise<IpcParticipant>((resolve, reject) => {
        const server = net.createServer(socket => {
            resolve(newParticipant(socket, handlers, resolvers))
        })
        server.listen(sockPath)
        server.on("error", err => reject(err))
    })
}

export function connectTo(sockPath: string) {
    const handlers = new Map<string, GeneralFunc>()
    const resolvers = new Map<number, GeneralFunc>()
    return new Promise<IpcParticipant>((resolve, reject) => {
        const client = net.createConnection(sockPath, () => {
            resolve(newParticipant(client, handlers, resolvers))
        })
        client.on("error", err => reject(err))
    })
}

function newParticipant(
    socket: Socket,
    handlers: SocketHandlers,
    resolvers: RequestResolvers
): IpcParticipant {
    const reader = createBufferReader()
    const onRequest: OnRequestMethod = setHandler
    const sendNotification: SendNotificationMethod = send
    const onNotification: OnNotificationMethod = setHandler

    const sendRequest: SendRequestMethod = (name, params) => {
        const requestId = getReleaseId()
        send(name, params, requestId)
        return new Promise(resolve => {
            resolvers.set(requestId, resolve)
        })
    }

    socket.on("data", buffer => {
        reader.read(buffer, ({ messageId, methodName, body }) => {
            const resolver = resolvers.get(messageId)
            if (!isUndefined(resolver)) {
                return resolver(body), releaseId(messageId)
            }

            const response = handlers.get(methodName)?.(body)
            if (!messageId) {
                return
            }

            const back = (res: any) => send("", res, messageId)
            isPromise(response) ? response.then(back) : back(response)
        })
    })

    function send(name: string, data: any, id = 0) {
        socket.write(createMessageBuffer(data, name, id))
    }

    function setHandler(name: string, handler: GeneralFunc) {
        handlers.set(name, handler)
    }

    return {
        onRequest,
        sendRequest,
        onNotification,
        sendNotification,
        close: socket.end
    }
}
