import type TS from "typescript"
import type { SetStateOptions } from "./types"
import type { QingKuaiSnapShot } from "./snapshot"
import type { RealPath } from "../../../types/common"
import type { GeneralFunc } from "../../../types/util"

import { inspect } from "../../../shared-util/log"
import { defaultParticipant } from "../../../shared-util/ipc/participant"

export let ts: typeof TS
export let server = defaultParticipant
export let lsProjectKindChanged = false
export let session: TS.server.Session | undefined
export let projectService: TS.server.ProjectService

// 已打开的文件列表
export const openQingkuaiFiles = new Set<RealPath>()

// 快照缓存，键为映射文件名称，值为QingkuaiSnapshot
export const snapshotCache = new Map<RealPath, QingKuaiSnapShot>()

// typescript扩展客户端命令执行状态，键名为要等待的命令，值为Promise和他的解决方法
export const commandStatus = new Map<string, readonly [Promise<any>, GeneralFunc]>()

export function setState(options: SetStateOptions) {
    if (options.ts) {
        ts = options.ts
    }
    if (options.server) {
        server = options.server
    }
    if (options.session) {
        session = options.session
    }
    if (options.projectService) {
        projectService = options.projectService
    }
    if (options.lsProjectKindChanged) {
        lsProjectKindChanged = options.lsProjectKindChanged
    }
}

// 通过qingkuai语言服务器输出日志
export const Logger = {
    info: (v: any) => server.sendNotification("log/info", inspect(v)),
    warn: (v: any) => server.sendNotification("log/info", inspect(v)),
    error: (v: any) => server.sendNotification("log/error", inspect(v))
}
