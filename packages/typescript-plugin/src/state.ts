import {
    TS,
    TSProject,
    TSProjectService,
    TSLanguageService,
    TSPluginCreateInfo,
    TSLanguageServerHost,
    TSLanguageServiceHost
} from "./types"

import path from "path"
import { inspect } from "../../../shared-util/log"
import { defaultParticipant } from "../../../shared-util/ipc/participant"

export let server = defaultParticipant

export let ts: TS
export let project: TSProject
export let projectService: TSProjectService
export let languageService: TSLanguageService
export let languageServerHost: TSLanguageServerHost
export let languageServiceHost: TSLanguageServiceHost

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

export const typeRefStatement = `/// <reference types="${path.resolve(__dirname, "../dts/qingkuai.d.ts")}" />\n`
