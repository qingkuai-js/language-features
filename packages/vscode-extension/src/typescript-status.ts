import type { TypeScriptInstallation } from "./types"

import * as vscode from "vscode"

import { client, disposables, typeScriptEntry } from "./state"
import { QK_COMMANDS, TypeScriptSource } from "../../../shared-util/constant"
import { resolveTypeScript, resolveTypeScriptEntry, getTypeScriptLoadFailure } from "./typescript"

export function attachTypeScriptStatus() {
    const item = vscode.languages.createLanguageStatusItem("Qingkuai.TypeScriptStatus", "qingkuai")
    item.name = "QingKuai TypeScript"
    item.command = {
        title: "Select Version",
        command: QK_COMMANDS.SelectTypeScriptPath
    }
    disposables.push(item)

    let pendingRestart: NodeJS.Timeout | undefined
    update()
    disposables.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (!event.affectsConfiguration("qingkuai.typescriptPath")) {
                return
            }
            update()

            if (!client?.isRunning() || resolveTypeScriptEntry() === typeScriptEntry) {
                clearTimeout(pendingRestart)
                return
            }
            pendingRestart = setTimeout(() => {
                vscode.commands.executeCommand(QK_COMMANDS.RestartLanguageServer)
            }, 500)
            clearTimeout(pendingRestart)
        })
    )

    function update() {
        const installation = resolveTypeScript()
        const failure = getTypeScriptLoadFailure()
        if (failure) {
            item.severity = vscode.LanguageStatusSeverity.Error
            item.text = "$(library) TypeScript: invalid path"
            item.detail = installation
                ? `using ${installation.label} ${installation.version ?? "unknown"}`
                : "no usable installation"
            return
        }
        if (installation) {
            item.severity = vscode.LanguageStatusSeverity.Information
            item.text = `$(library) TypeScript ${installation.version ?? "unknown"}`
            item.detail = sourceDescription(installation)
        } else {
            item.severity = vscode.LanguageStatusSeverity.Warning
            item.text = "$(library) TypeScript: not found"
            item.detail = "click to select one"
        }
    }
}

function sourceDescription(installation: TypeScriptInstallation) {
    switch (installation.source) {
        case TypeScriptSource.Setting: {
            return "from qingkuai.typescriptPath"
        }
        case TypeScriptSource.Workspace: {
            return "from the workspace"
        }
        default: {
            return "bundled with VS Code"
        }
    }
}
