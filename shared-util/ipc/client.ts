import type { ClientResolvedValue } from "./types"
import type { GeneralFunc } from "../../types/util"

import net from "net"
import { noop } from "../constant"
import { getSockPath } from "./sock"

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
                        JSON.stringify({
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

        client.on("data", bf => {
            const { uri, data: v } = JSON.parse(bf.toString())
            const handler = handlers[uri]
            handler && handler(v)
        })

        client.on("error", err => {
            reject(err)
        })
    })
}
