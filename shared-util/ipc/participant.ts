import type {
    SocketHandlers,
    IpcParticipant,
    OnRequestMethod,
    RequestResolvers,
    SendRequestMethod,
    OnNotificationMethod,
    SendNotificationMethod
} from "./types"
import type { Socket } from "node:net"
import type { GeneralFunc } from "../../types/util"

import nodeNet from "node:net"
import nodeFs from "node:fs"
import nodeOs from "node:os"
import nodePath from "node:path"

import { NOOP } from "../constant"
import { getReleaseId, releaseId } from "./id"
import { isUndefined, isPromise } from "../assert"
import { createMessageBuffer, createBufferReader } from "./buffer"

// 错误信封：请求处理器同步抛错或 Promise reject 时以此回传给调用方，
// 使其 sendRequest 返回的 Promise 能够 reject，而不是永久 pending
export const IPC_ERROR_KEY = "__qingkuaiIpcError"

// 请求超时的安全网：仅用于把"永不返回"的请求变成显式失败，正常路径不会触发
const REQUEST_TIMEOUT = 120000

// 延迟追踪：QK_IPC_TRACE=1 时输出到系统临时目录，也可直接设为日志文件路径；
// QK_IPC_TRACE_SLOW_MS 控制记录阈值（设为 0 可记录每一条请求/响应用于完整时序剖面）
const TRACE_SLOW_MS = Number(process.env.QK_IPC_TRACE_SLOW_MS ?? 200)
const traceFile = (() => {
    const value = process.env.QK_IPC_TRACE
    if (!value) {
        return ""
    }
    return value === "1" ? nodePath.join(nodeOs.tmpdir(), "qk-ipc-trace.log") : value
})()

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
    const reader = createBufferReader()
    // 请求 id -> 发出的方法名与发出时刻，用于追踪长时间未返回的请求
    const pendingMeta = new Map<string, { name: string; startedAt: number }>()
    trace(`[${type}#${process.pid}] participant ready thresh=${TRACE_SLOW_MS}ms`)
    const onRequest: OnRequestMethod = setHandler
    const sendNotification: SendNotificationMethod = send
    const onNotification: OnNotificationMethod = setHandler

    const sendRequest: SendRequestMethod = (name, params) => {
        const requestId = type[0] + getReleaseId()
        let timer: NodeJS.Timeout | undefined
        return new Promise((resolve, reject) => {
            const settle = (body: any) => {
                clearTimeout(timer)
                pendingMeta.delete(requestId)
                if (body !== null && typeof body === "object" && IPC_ERROR_KEY in body) {
                    reject(new Error(String(body[IPC_ERROR_KEY])))
                } else {
                    resolve(body)
                }
            }
            // 先登记 resolver 再发送，彻底排除"响应先于 resolver 到达"的可能
            resolvers.set(requestId, settle)
            pendingMeta.set(requestId, { name, startedAt: Date.now() })
            send(name, params, requestId)
            timer = setTimeout(() => {
                if (!resolvers.has(requestId)) {
                    return
                }
                resolvers.delete(requestId)
                pendingMeta.delete(requestId)
                releaseId(parseInt(requestId.slice(1)))
                trace(`[${type}#${process.pid}] TIMEOUT ${name} after ${REQUEST_TIMEOUT}ms`)
                reject(new Error(`ipc request "${name}" exceeded ${REQUEST_TIMEOUT}ms`))
            }, REQUEST_TIMEOUT)
        })
    }

    socket.setNoDelay(true)
    socket.on("data", buffer => {
        reader.read(buffer, ({ messageId, methodName, body }) => {
            const resolver = resolvers.get(messageId)
            if (!isUndefined(resolver)) {
                resolvers.delete(messageId)
                releaseId(parseInt(messageId.slice(1)))
                const meta = pendingMeta.get(messageId)
                if (meta) {
                    pendingMeta.delete(messageId)
                    const elapsed = Date.now() - meta.startedAt
                    if (elapsed >= TRACE_SLOW_MS) {
                        trace(`[${type}#${process.pid}] RESP ${meta.name} ${elapsed}ms`)
                    }
                }
                resolver(body)
                return
            }

            // methodName 为空说明这是一条"响应"。没有匹配的 resolver 即为孤儿响应（对端已超时
            // 或重复响应），必须静默丢弃：旧实现会继续按 methodName 查处理器并回执一条空响应，
            // 两端都如此便会互相回执成死循环，持续占用事件循环
            if (!methodName) {
                trace(`[${type}#${process.pid}] DROP orphan response id=${messageId}`)
                return
            }

            const handler = handlers.get(methodName)
            const back = (res: any) => send("", res, messageId)

            if (isUndefined(handler)) {
                if (messageId) {
                    trace(`[${type}#${process.pid}] NO_HANDLER ${methodName}`)
                    back({ [IPC_ERROR_KEY]: `no ipc handler registered for "${methodName}"` })
                }
                return
            }

            // 通知：只执行处理器，不需要响应；同步异常不能冒泡成进程级未捕获异常
            if (!messageId) {
                try {
                    handler(body)
                } catch (err) {
                    trace(`[${type}#${process.pid}] NOTIFY_THROWN ${methodName} ${errorMessage(err)}`)
                }
                return
            }

            const startedAt = Date.now()
            const respond = (res: any) => {
                const elapsed = Date.now() - startedAt
                if (elapsed >= TRACE_SLOW_MS) {
                    trace(`[${type}#${process.pid}] HANDLE ${methodName} ${elapsed}ms`)
                }
                back(res)
            }

            // 每个请求都必须且只能回一条响应：同步抛错与 Promise reject 都要转成错误信封，
            // 否则对端 sendRequest 永久 pending——这正是"请求永不返回"的成因
            try {
                const response = handler(body)
                if (isPromise(response)) {
                    response.then(respond, err => {
                        trace(`[${type}#${process.pid}] HANDLER_REJECT ${methodName} ${errorMessage(err)}\n${errorStack(err)}`)
                        respond({ [IPC_ERROR_KEY]: errorMessage(err) })
                    })
                } else {
                    respond(response)
                }
            } catch (err) {
                trace(`[${type}#${process.pid}] HANDLER_THROWN ${methodName} ${errorMessage(err)}\n${errorStack(err)}`)
                respond({ [IPC_ERROR_KEY]: errorMessage(err) })
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
            trace(`[${type}#${process.pid}] SEND_FAILED ${name} ${errorMessage(err)}`)
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
        trace(`[${type}#${process.pid}] FAIL_PENDING n=${resolvers.size} ${reason}`)
        for (const id of Array.from(resolvers.keys())) {
            const settle = resolvers.get(id)!
            resolvers.delete(id)
            pendingMeta.delete(id)
            releaseId(parseInt(id.slice(1)))
            settle({ [IPC_ERROR_KEY]: reason })
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
        close: socket.end
    }
}

function errorMessage(err: any) {
    return err instanceof Error ? err.message : String(err)
}

function errorStack(err: any) {
    return err instanceof Error && err.stack ? err.stack : ""
}

function trace(line: string) {
    if (!traceFile) {
        return
    }
    try {
        nodeFs.appendFileSync(traceFile, line + "\n")
    } catch {}
}
