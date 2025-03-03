import type { TS, TSProjectService, QingKuaiDiagnostic, TSPluginCreateInfo } from "./types"
import type { QingKuaiSnapShot } from "./snapshot"

import path from "path"
import { inspect } from "../../../shared-util/log"
import { defaultParticipant } from "../../../shared-util/ipc/participant"

export let server = defaultParticipant

export let ts: TS
export let triggerQingkuaiFileName = ""
export let projectService: TSProjectService

// 快照缓存，键为映射文件名称，值为QingkuaiSnapshot
export const snapshotCache = new Map<string, QingKuaiSnapShot>()

// import语句导入目标为目录时解析为qingkuai源文件的记录
export const resolvedQingkuaiModule = new Map<string, Set<string>>()

// qingkuai自定义错误缓存
export const qingkuaiDiagnostics = new Map<string, QingKuaiDiagnostic[]>()

export function setServer(v: typeof server) {
    server = v
}

export function setTriggerQingkuaiFileName(fileName: string) {
    triggerQingkuaiFileName = fileName
}

export function setTSState(t: TS, info: TSPluginCreateInfo) {
    ;[ts, projectService] = [t, info.project.projectService]
}

// 通过qingkuai语言服务器输出日志
export const Logger = {
    info: (v: any) => server.sendNotification("log/info", inspect(v)),
    warn: (v: any) => server.sendNotification("log/info", inspect(v)),
    error: (v: any) => server.sendNotification("log/error", inspect(v))
}

export const typeDeclarationFilePath = path.resolve(__dirname, "../dts/qingkuai.d.ts")
export const typeRefStatement = `/// <reference types="${typeDeclarationFilePath}" />\n`
