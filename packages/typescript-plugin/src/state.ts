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

import path from "path"
import { defaultParticipant } from "../../../shared-util/ipc"

export let server = defaultParticipant

export let ts: TS
export let project: TSProject
export let program: TSProgram
export let typeChecker: TSTypeChecker
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
    program = languageService.getProgram()!
    typeChecker = program.getTypeChecker()
    languageServiceHost = info.languageServiceHost
}

// 通过qingkuai语言服务器输出日志
export const Logger = {
    info: (msg: string) => server.sendNotification("log/info", msg),
    warn: (msg: string) => server.sendNotification("log/info", msg),
    error: (msg: string) => server.sendNotification("log/error", msg)
}

export const typeCheckerStatement = `/// <reference types="${path.resolve(__dirname, "../dts/type-checker.d.ts")}" />\n`
