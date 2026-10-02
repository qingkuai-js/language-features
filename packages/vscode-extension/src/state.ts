import type { SetStateOptions } from "./types"
import type { LanguageClient } from "vscode-languageclient/node"

import * as vscode from "vscode"

import { createLogger } from "../../../shared-util/log"
import { isUndefined } from "../../../shared-util/assert"
import { ProjectKind } from "../../../shared-util/constant"
import { createConfigResolver } from "qingkuai-language-service"
import { ADAPTER_FS, ADAPTER_PATH } from "../../../shared-util/constant"
import { generatePromiseAndResolver } from "../../../shared-util/sundry"

export const outputChannel = vscode.window.createOutputChannel("QingKuai", "log")
export const Logger = createLogger({ write: outputChannel.appendLine })
export const qingkuaiConfigResolver = createConfigResolver(ADAPTER_FS, ADAPTER_PATH)

export const languageStatusItem = vscode.languages.createLanguageStatusItem(
    "Qingkuai.LanguageServerStatus",
    "qingkuai"
)
languageStatusItem.text = "QingKuai Language Server"

export let client: LanguageClient
export let serverModulePath: string
export let projectKind = ProjectKind.JS
export let limitedScriptLanguageFeatures = true

export const disposables: vscode.Disposable[] = [outputChannel]

// 语言服务器工作区就绪后解决的 Promise，每次激活语言服务器时重置
export let [workspaceReadyPromise, workspaceReadyResolver] = generatePromiseAndResolver()

export function setState(options: SetStateOptions) {
    if (!isUndefined(options.client)) {
        client = options.client
    }
    if (options.projectKind) {
        projectKind = options.projectKind
    }
    if (options.serverModulePath) {
        serverModulePath = options.serverModulePath
    }
    if (!isUndefined(options.limitedScriptLanguageFeatures)) {
        limitedScriptLanguageFeatures = options.limitedScriptLanguageFeatures
    }
    if (options.workspaceReadyPromise) {
        workspaceReadyPromise = options.workspaceReadyPromise
    }
    if (options.workspaceReadyResolver) {
        workspaceReadyResolver = options.workspaceReadyResolver
    }
}
