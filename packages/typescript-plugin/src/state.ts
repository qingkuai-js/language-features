import type TS from "typescript"

import type { SetStateOptions } from "./types"
import type { GeneralFunc } from "../../../types/util"
import type { TypescriptAdapter } from "qingkuai-language-service/adapters"

import { inspect } from "../../../shared-util/log"
import { DEFAULT_PARTICIPANT } from "../../../shared-util/ipc/participant"

export let ts: typeof TS
export let adapter: TypescriptAdapter
export let tsPluginIpcServer = DEFAULT_PARTICIPANT

// typescript扩展客户端命令执行状态，键名为要等待的命令，值为Promise和他的解决方法
export const tsServerCommandStatus = new Map<string, readonly [Promise<any>, GeneralFunc]>()

export function setState(options: SetStateOptions) {
    if (options.ts) {
        ts = options.ts
    }
    if (options.adapter) {
        adapter = options.adapter
    }
    if (options.server) {
        tsPluginIpcServer = options.server
    }
}

// 通过qingkuai语言服务器输出日志
export const Logger = {
    info: (v: any) => tsPluginIpcServer.sendNotification("log/info", inspect(v)),
    warn: (v: any) => tsPluginIpcServer.sendNotification("log/info", inspect(v)),
    error: (v: any) => tsPluginIpcServer.sendNotification("log/error", inspect(v))
}
