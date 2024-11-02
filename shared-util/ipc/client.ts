import type { ClientResolvedValue } from "./types"
import type { GeneralFunc } from "../../types/util"

import net from "net"
import { noop } from "../constant"
import { getSockPath } from "./sock"
import { createBufferReader, createMessageBuffer } from "./buffer"

export const defaultClient: ClientResolvedValue = {
    send: noop,
    close: noop,
    onMessage: noop
}

export function connectTo(name: string) {
    return new Promise<ClientResolvedValue>((resolve, reject) => {
        const handlers: Record<string, GeneralFunc> = {}
        const client = net.createConnection(getSockPath(name), () => {
            resolve({
                send(uri, data) {
                    client.write(
                        createMessageBuffer({
                            uri,
                            data
                        })
                    )
                },
                onMessage(uri, handler) {
                    handlers[uri] = handler
                },
                close(cb) {
                    client.end(cb)
                }
            })
        })
        const reader = createBufferReader(handlers)

        client.on("data", bf => {
            reader.read(bf)
        })

        client.on("error", err => {
            reject(err)
        })
    })
}
