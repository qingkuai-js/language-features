import type { SetStateOptions } from "./types"
import type { LanguageClient } from "vscode-languageclient/node"

import * as vscode from "vscode"
import { createLogger } from "../../../shared-util/log"
import { isUndefined } from "../../../shared-util/assert"

export const outputChannel = vscode.window.createOutputChannel("QingKuai", "log")
export const Logger = createLogger({ write: outputChannel.append })

export let client: LanguageClient
export let limitedScriptLanguageFeatures = false

export function setState(options: SetStateOptions) {
    if (!isUndefined(options.client)) {
        client = options.client
    }
    if (!isUndefined(options.limitedScriptLanguageFeatures)) {
        limitedScriptLanguageFeatures = options.limitedScriptLanguageFeatures
    }
}
