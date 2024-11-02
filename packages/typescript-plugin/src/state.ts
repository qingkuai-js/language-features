import {
    TS,
    TSProgram,
    TSProject,
    TSTypeChecker,
    TSProjectService,
    TSLanguageService,
    TSPluginCreateInfo,
    TSLanguageServerHost,
    TSLanguageServiceHost
} from "./types"
import type { ServerResolveValue } from "../../../shared-util/ipc/types"

import { defaultServer } from "../../../shared-util/ipc/server"

export let server = defaultServer

export let ts: TS
export let project: TSProject
export let program: TSProgram
export let typeChecker: TSTypeChecker
export let projectService: TSProjectService
export let languageService: TSLanguageService
export let languageServerHost: TSLanguageServerHost
export let languageServiceHost: TSLanguageServiceHost

export function setTSState(t: TS, info: TSPluginCreateInfo) {
    ts = t
    project = info.project
    languageServerHost = info.serverHost
    languageService = info.languageService
    projectService = project.projectService
    program = languageService.getProgram()!
    typeChecker = program.getTypeChecker()
    languageServiceHost = info.languageServiceHost
}

export function setServer(v: ServerResolveValue) {
    server = v
}

// 通过qingkuai语言服务器输出日志
export const Logger = {
    info: (msg: string) => server.send("log/info", msg),
    warn: (msg: string) => server.send("log/info", msg),
    error: (msg: string) => server.send("log/error", msg)
}
