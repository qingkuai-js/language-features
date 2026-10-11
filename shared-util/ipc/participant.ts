import type {
    SocketHandlers,
    IpcParticipant,
    OnRequestMethod,
    PendingRequestMeta,
    RequestResolvers,
    SendRequestMethod,
    OnNotificationMethod,
    SendNotificationMethod
} from "./types"
import type { Socket } from "node:net"
import type { GeneralFunc } from "../../types/util"

import nodeNet from "node:net"
import nodeFs from "node:fs"
import nodePath from "node:path"

import { NOOP } from "../constant"
import { getIpcRuntimeDir } from "./sock"
import { getReleaseId, releaseId } from "./id"
import { isUndefined, isPromise } from "../assert"
import { createMessageBuffer, createBufferReader } from "./buffer"

const traceLine = ((traceFilePath?: string) => {
    return (line: string) => {
        if (isUndefined(traceFilePath)) {
            if (!IPC_TRACE || IPC_TRACE === "0") {
                traceFilePath = ""
            } else if (IPC_TRACE !== "1") {
                traceFilePath = IPC_TRACE
            } else {
                traceFilePath = nodePath.join(getIpcRuntimeDir(), "ipc-trace.log")
            }
        }
        if (!traceFilePath) {
            return
        }
        try {
            nodeFs.appendFileSync(traceFilePath, line + "\n")
        } catch {}
    }
})()

const REQUEST_TIMEOUT = 120000
const IPC_TRACE = process.env.IPC_TRACE
const TRACE_SLOW_MS = Number(process.env.QK_IPC_TRACE_SLOW_MS ?? 200)

export const DEFAULT_PARTICIPANT: IpcParticipant = {
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
        const server = nodeNet.createServer(socket => {
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
        const client = nodeNet.createConnection(sockPath, () => {
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
    const trace = (line: string) => {
        traceLine(`[${type}#${process.pid}] ${line}`)
    }

    const reader = createBufferReader((msg, body) => {
        trace(`READ_FAIL ${msg} head=${JSON.stringify(body.subarray(0, 64).toString("utf8"))}`)
    })

    const onRequest: OnRequestMethod = setHandler
    const sendNotification: SendNotificationMethod = send
    const onNotification: OnNotificationMethod = setHandler
    const pendingMeta = new Map<string, PendingRequestMeta>()
    trace(`participant ready thresh=${TRACE_SLOW_MS}ms`)

    const sendRequest: SendRequestMethod = (name, params) => {
        let timer: NodeJS.Timeout | undefined
        const requestId = type[0] + getReleaseId()
        return new Promise((resolve, reject) => {
            resolvers.set(requestId, (body: any) => {
                clearTimeout(timer)
                pendingMeta.delete(requestId)
                if (body?.msg !== undefined) {
                    reject(new Error(String(body.msg)))
                } else {
                    resolve(body?.value)
                }
            })
            pendingMeta.set(requestId, { name, startedAt: Date.now() })
            send(name, params, requestId)
            timer = setTimeout(() => {
                if (!resolvers.has(requestId)) {
                    return
                }
                resolvers.delete(requestId)
                pendingMeta.delete(requestId)
                releaseId(parseInt(requestId.slice(1)))
                trace(`TIMEOUT ${name} after ${REQUEST_TIMEOUT}ms`)
                reject(new Error(`ipc request "${name}" exceeded ${REQUEST_TIMEOUT}ms`))
            }, REQUEST_TIMEOUT)
        })
    }

    socket.setNoDelay(true).on("data", buffer => {
        reader.read(buffer, ({ messageId, methodName, body }) => {
            const resolver = resolvers.get(messageId)
            if (!isUndefined(resolver)) {
                resolvers.delete(messageId)
                releaseId(parseInt(messageId.slice(1)))

                const meta = pendingMeta.get(messageId)
                if (meta) {
                    const elapsed = Date.now() - meta.startedAt
                    if (elapsed >= TRACE_SLOW_MS) {
                        trace(`RESP ${meta.name} ${elapsed}ms`)
                    }
                    pendingMeta.delete(messageId)
                }
                resolver(body)
                return
            }

            if (!methodName) {
                return trace(`DROP orphan response id=${messageId}`)
            }

            const handler = handlers.get(methodName)
            const back = (res: any) => send("", { value: res }, messageId)
            const backError = (msg: string) => send("", { msg }, messageId)

            if (isUndefined(handler)) {
                if (messageId) {
                    trace(`NO_HANDLER ${methodName}`)
                    backError(`no ipc handler registered for "${methodName}"`)
                }
                return
            }

            if (!messageId) {
                try {
                    handler(body)
                } catch (err) {
                    trace(`NOTIFY_THROWN ${methodName} ${errorMessage(err)}`)
                }
                return
            }

            const startedAt = Date.now()
            const respond = (res: any) => {
                const elapsed = Date.now() - startedAt
                if (elapsed >= TRACE_SLOW_MS) {
                    trace(`HANDLE ${methodName} ${elapsed}ms`)
                }
                back(res)
            }

            try {
                const response = handler(body)
                if (isPromise(response)) {
                    response.then(respond, err => {
                        trace(
                            `HANDLER_REJECT ${methodName} ${errorMessage(err)}\n${errorStack(err)}`
                        )
                        backError(errorMessage(err))
                    })
                } else {
                    respond(response)
                }
            } catch (err) {
                trace(`HANDLER_THROWN ${methodName} ${errorMessage(err)}\n${errorStack(err)}`)
                backError(errorMessage(err))
            }
        })
    })

    function onClose(callback: () => void) {
        socket.on("close", callback)
    }

    function send(name: string, data: any, id = "") {
        try {
            socket.write(createMessageBuffer(data, name, id))
        } catch (err) {
            trace(`SEND_FAILED ${name} ${errorMessage(err)}`)
        }
    }

    function setHandler(name: string, handler: GeneralFunc) {
        handlers.set(name, handler)
    }

    // 连接断开/出错时结算所有在途请求，避免调用方永久等待（同时归还 id，防止 id 池耗尽）
    function failPendingRequests(reason: string) {
        if (resolvers.size === 0) {
            return
        }
        trace(`FAIL_PENDING n=${resolvers.size} ${reason}`)
        for (const id of resolvers.keys()) {
            const settle = resolvers.get(id)!
            resolvers.delete(id)
            pendingMeta.delete(id)
            releaseId(parseInt(id.slice(1)))
            settle({ msg: reason })
        }
    }

    socket.on("error", () => failPendingRequests("ipc socket error before response"))
    socket.on("close", () => failPendingRequests("ipc socket closed before response"))

    return {
        onClose,
        onRequest,
        sendRequest,
        onNotification,
        sendNotification,
        close: () => socket.end()
    }
}

function errorMessage(err: any) {
    return err instanceof Error ? err.message : String(err)
}

function errorStack(err: any) {
    return err instanceof Error && err.stack ? err.stack : ""
}
