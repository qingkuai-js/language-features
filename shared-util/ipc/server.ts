import type { ServerResolveValue } from "./types"
import type { GeneralFunc } from "../../types/util"

import net from "net"
import { getSockPath, rmSockFile } from "./sock"
import { noop } from "../constant"
import { createBufferReader, createMessageBuffer } from "./buffer"

export const defaultServer: ServerResolveValue = {
    send: noop,
    close: noop,
    onMessage: noop
}

export function createServer(name: string) {
    const handlers: Record<string, GeneralFunc> = {}
    const reader = createBufferReader(handlers)
    const sockPath = getSockPath(name)

    return new Promise<ServerResolveValue>(resolve => {
        const server = net.createServer(socket => {
            socket.on("data", bf => {
                reader.read(bf)
            })

            resolve({
                send: (uri, data) => {
                    socket.write(
                        createMessageBuffer({
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
