import type {
    TS,
    TSProject,
    TSProjectService,
    TSLanguageService,
    QingKuaiDiagnostic,
    TSPluginCreateInfo,
    TSLanguageServerHost,
    TSLanguageServiceHost
} from "./types"
import type { QingKuaiSnapShot } from "./snapshot"

import path from "path"
import { inspect } from "../../../shared-util/log"
import { defaultParticipant } from "../../../shared-util/ipc/participant"
import { QingkuaiConfiguration } from "../../../types/common"

export let server = defaultParticipant

export let ts: TS
export let project: TSProject
export let projectService: TSProjectService
export let languageService: TSLanguageService
export let languageServerHost: TSLanguageServerHost
export let languageServiceHost: TSLanguageServiceHost

// 快照缓存，键为映射文件名称，值为QingkuaiSnapshot
export const snapshotCache = new Map<string, QingKuaiSnapShot>()

// .qingkuairc文件配置内容，键为其所在的目录
export const configurations = new Map<string, QingkuaiConfiguration>()

// qingkuai自定义错误缓存
export const qingkuaiDiagnostics = new Map<string, QingKuaiDiagnostic[]>()

export function setServer(v: typeof server) {
    server = v
}

export function setTSState(t: TS, info: TSPluginCreateInfo) {
    ts = t
    project = info.project
    languageServerHost = info.serverHost
    languageService = info.languageService
    projectService = project.projectService
    languageServiceHost = info.languageServiceHost
}

// 通过qingkuai语言服务器输出日志
export const Logger = {
    info: (v: any) => server.sendNotification("log/info", inspect(v)),
    warn: (v: any) => server.sendNotification("log/info", inspect(v)),
    error: (v: any) => server.sendNotification("log/error", inspect(v))
}

export const typeDeclarationFilePath = path.resolve(__dirname, "../dts/qingkuai.d.ts")
export const typeRefStatement = `/// <reference types="${typeDeclarationFilePath}" />\n`
