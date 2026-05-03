import type { ExtensionContext } from "vscode"

import * as vscode from "vscode"

import {
    client,
    setState,
    outputChannel,
    languageStatusItem
} from "./state"
import { QingkuaiCommands } from "./command"
import { activeLanguageServer } from "./language-server"
import { isQingkuaiFileName } from "../../../shared-util/assert"
import { registerMcpServerDefinitionProvider } from "./mcp-server"

export function deactivate(): Thenable<void> | undefined {
    return client && client.stop()
}

export async function activate(context: ExtensionContext) {
    const commands = new QingkuaiCommands(outputChannel, activeLanguageServer)
    const activeDocument = vscode.window.activeTextEditor?.document
    registerMcpServerDefinitionProvider(context)
    setState({
        serverModulePath: context.asAbsolutePath("./dist/server.js")
    })
    languageStatusItem.command = {
        title: "View Logs",
        command: commands.viewServerLogs
    }
    context.subscriptions.push(languageStatusItem)

    if (isQingkuaiFileName(activeDocument?.uri.fsPath || "")) {
        return activeLanguageServer()
    }

    const disposable = vscode.window.onDidChangeActiveTextEditor(e => {
        if (isQingkuaiFileName(e?.document.uri.fsPath || "")) {
            activeLanguageServer()
            disposable.dispose()
        }
    })
    return () => client.stop()
}
