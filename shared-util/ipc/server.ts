import type { ServerResolveValue } from "./types"
import type { GeneralFunc } from "../../types/util"

import net from "net"
import { getSockPath, rmSockFile } from "./sock"
import { noop } from "../constant"

export const defaultServer: ServerResolveValue = {
    send: noop,
    close: noop,
    onMessage: noop
}

export function createServer(name: string) {
    const handlers: Record<string, GeneralFunc> = {}
    const sockPath = getSockPath(name)

    return new Promise<ServerResolveValue>(resolve => {
        const server = net.createServer(socket => {
            socket.on("data", bf => {
                const { uri, data: v } = JSON.parse(bf.toString())
                const handler = handlers[uri]
                handler && handler(v)
            })

            resolve({
                send: (uri, data) => {
                    socket.write(
                        JSON.stringify({
                            uri,
                            data
                        })
                    )
                },
                onMessage: (uri, handler) => {
                    handlers[uri] = handler
                },
                close: err => {
                    rmSockFile(sockPath)
                    return server.close(err)
                }
            })
        })

        server.listen(sockPath)
    })
}
