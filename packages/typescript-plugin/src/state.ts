import type TS from "typescript"

import type { SetStateOptions } from "./types"
import type { GeneralFunc } from "../../../types/util"
import type { TypescriptAdapter } from "qingkuai-language-service/adapters"

import { createLogger } from "../../../shared-util/log"
import { DEFAULT_PARTICIPANT } from "../../../shared-util/ipc/participant"

export let ts: typeof TS
export let adapter: TypescriptAdapter
export let tsPluginIpcServer = DEFAULT_PARTICIPANT
export let projectService: TS.server.ProjectService

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
    if (options.projectService) {
        projectService = options.projectService
    }
}

// 通过qingkuai语言服务器输出日志
export const Logger = createLogger({
    write(msg: string) {
        tsPluginIpcServer.sendNotification("log", msg)
    },
    prefix: "From typescript-plugin-qingkuai: "
})
