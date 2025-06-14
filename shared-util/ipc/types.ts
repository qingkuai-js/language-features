import type { GeneralFunc } from "../../types/util"
import type { FuncWithCallBack } from "../../types/common"

export type Message = {
    body: any
    messageId: string
    methodName: string
}

export type IpcParticipant = {
    close: () => void
    onClose: FuncWithCallBack
    onRequest: OnRequestMethod
    sendRequest: SendRequestMethod
    onNotification: OnNotificationMethod
    sendNotification: SendNotificationMethod
}

export type OnRequestMethod = <P, R = any>(
    name: string,
    handler: (params: P) => R | Promise<R>
) => void
export type SocketHandlers = Map<string, GeneralFunc>
export type RequestResolvers = Map<string, GeneralFunc>
export type SendNotificationMethod = <P>(name: string, params: P) => void
export type SendRequestMethod = <P, R = any>(name: string, params: P) => Promise<R>
export type OnNotificationMethod = <P>(name: string, handler: (params: P) => void) => void
