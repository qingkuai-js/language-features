import type TS from "typescript"
import type { QingKuaiSnapShot } from "./snapshot"
import type { RealPath } from "../../../types/common"
import type { QingKuaiDiagnostic, SetStateOptions } from "./types"

import path from "node:path"
import { inspect } from "../../../shared-util/log"
import { defaultParticipant } from "../../../shared-util/ipc/participant"

export let ts: typeof TS
export let server = defaultParticipant
export let session: TS.server.Session | undefined
export let projectService: TS.server.ProjectService
export let lsProjectKindChanged = false

// 已打开的文件列表
export const openQingkuaiFiles = new Set<RealPath>()

// 将typscript中使用的文件名（NormalizedPath）转换为真实路径
export const tsFileNameToRealPath = new Map<string, RealPath>()

// 快照缓存，键为映射文件名称，值为QingkuaiSnapshot
export const snapshotCache = new Map<RealPath, QingKuaiSnapShot>()

// import语句导入目标为目录时解析为qingkuai源文件的记录
export const resolvedQingkuaiModule = new Map<RealPath, Set<string>>()

// qingkuai自定义错误缓存
export const qingkuaiDiagnostics = new Map<RealPath, QingKuaiDiagnostic[]>()

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

export const typeDeclarationFilePath = path.resolve(__dirname, "../dts/qingkuai.d.ts")
export const typeRefStatement = `/// <reference types="${typeDeclarationFilePath}" />\n`
