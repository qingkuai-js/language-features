import type { Server } from "net"
import type { GeneralFunc } from "../../types/util"

type SendMethod = <T = any>(uri: string, data: T) => void
type OnMessageMethod = <T extends GeneralFunc>(uri: string, handler: T) => void

export type ServerResolveValue = {
    close: Server["close"]
    send: SendMethod
    onMessage: OnMessageMethod
}

export type ClientResolvedValue = {
    send: SendMethod
    onMessage: OnMessageMethod
    close: (cb: () => void) => void
}
