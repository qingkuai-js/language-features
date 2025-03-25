import type { SetStateOptions } from "./types"
import type { LanguageClient } from "vscode-languageclient/node"

import * as vscode from "vscode"
import { createLogger } from "../../../shared-util/log"
import { isUndefined } from "../../../shared-util/assert"

export const outputChannel = vscode.window.createOutputChannel("QingKuai", "log")
export const Logger = createLogger({ write: outputChannel.appendLine })

export const languageStatusItem = vscode.languages.createLanguageStatusItem(
    "Qingkuai.LanguageServerStatus",
    "qingkuai"
)
languageStatusItem.text = "QingKuai Language Server"

export let client: LanguageClient
export let serverModulePath: string
export let limitedScriptLanguageFeatures = false

export function setState(options: SetStateOptions) {
    if (!isUndefined(options.client)) {
        client = options.client
    }
    if (options.serverModulePath) {
        serverModulePath = options.serverModulePath
    }
    if (!isUndefined(options.limitedScriptLanguageFeatures)) {
        limitedScriptLanguageFeatures = options.limitedScriptLanguageFeatures
    }
}
