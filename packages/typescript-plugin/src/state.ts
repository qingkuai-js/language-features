import {
    TS,
    TSProject,
    TSProjectService,
    TSLanguageService,
    TSLanguageServerHost,
    TSLanguageServiceHost
} from "./types"
import type { ServerResolveValue } from "../../../shared-util/ipc/types"

import { defaultServer } from "../../../shared-util/ipc/server"

export let server = defaultServer

export let ts: TS
export let project: TSProject
export let projectService: TSProjectService
export let languageService: TSLanguageService
export let languageServerHost: TSLanguageServerHost
export let languageServiceHost: TSLanguageServiceHost

export function setTS(v: TS) {
    ts = v
}
export function setProject(v: TSProject) {
    project = v
}
export function setServer(v: ServerResolveValue) {
    server = v
}
export function setProjectService(v: TSProjectService) {
    projectService = v
}
export function setLanguageService(v: TSLanguageService) {
    languageService = v
}
export function setLanguageServerHost(v: TSLanguageServerHost) {
    languageServerHost = v
}
export function setLanguageServiceHost(v: TSLanguageServiceHost) {
    languageServiceHost = v
}
