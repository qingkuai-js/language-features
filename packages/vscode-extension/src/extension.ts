import type { ExtensionContext } from "vscode"

import * as vscode from "vscode"

import { registerQingkuaiCommands } from "./command"
import { activeLanguageServer } from "./language-server"
import { QK_COMMANDS } from "../../../shared-util/constant"
import { attachTypeScriptStatus } from "./typescript-status"
import { isQingkuaiFileName } from "../../../shared-util/assert"
import { registerMcpServerDefinitionProvider } from "./mcp-server"
import { client, setState, disposables, outputChannel, languageStatusItem } from "./state"

export function deactivate(): Thenable<void> | undefined {
    disposables.forEach(d => {
        d.dispose()
    })
    disposables.length = 0
    return client && client.stop()
}

export async function activate(context: ExtensionContext) {
    const activeDocument = vscode.window.activeTextEditor?.document
    registerQingkuaiCommands(outputChannel, activeLanguageServer)
    registerMcpServerDefinitionProvider(context)
    setState({
        serverModulePath: context.asAbsolutePath("./dist/server.js")
    })
    languageStatusItem.command = {
        title: "View Logs",
        command: QK_COMMANDS.ViewServerLogs
    }
    context.subscriptions.push(languageStatusItem)
    attachTypeScriptStatus()

    if (isQingkuaiFileName(activeDocument?.uri.fsPath || "")) {
        return activeLanguageServer()
    }

    const disposable = vscode.window.onDidChangeActiveTextEditor(e => {
        if (isQingkuaiFileName(e?.document.uri.fsPath || "")) {
            activeLanguageServer()
            disposable.dispose()
        }
    })

    disposables.push(disposable)
    return () => client.stop()
}
