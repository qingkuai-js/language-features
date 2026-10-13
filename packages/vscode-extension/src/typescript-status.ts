import type { TypeScriptInstallation } from "./typescript"

import * as vscode from "vscode"

import { disposables } from "./state"
import { resolveTypeScript } from "./typescript"

// qingkuai 的语言状态项只能挂一个 command，所以 typescript 单独占一个状态项：与 "QingKuai Language
// Server" 并排显示编译器实际使用的版本，点击即可重新选择
// A language status item can only carry a single command, so the typescript gets its own item: it
// sits next to "QingKuai Language Server", shows the version the compiler actually uses and opens
// the picker when clicked.
export function attachTypeScriptStatus(selectTypeScriptPathCommand: string) {
    const item = vscode.languages.createLanguageStatusItem("Qingkuai.TypeScriptStatus", "qingkuai")
    item.name = "QingKuai TypeScript"
    item.command = {
        title: "Select TypeScript for the QingKuai Compiler",
        command: selectTypeScriptPathCommand
    }
    disposables.push(item)

    update()
    disposables.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration("qingkuai.typescriptPath")) {
                update()
            }
        })
    )

    function update() {
        const installation = resolveTypeScript()
        if (!installation) {
            item.severity = vscode.LanguageStatusSeverity.Warning
            item.text = "$(library) TypeScript: not found"
            item.detail = "click to select one"
            item.accessibilityInformation = {
                label: "QingKuai: no typescript installation found, click to select one"
            }
            return
        }
        item.severity = vscode.LanguageStatusSeverity.Information
        item.text = `$(library) TypeScript ${installation.version ?? "unknown"}`
        item.detail = sourceDescription(installation)
        item.accessibilityInformation = {
            label:
                `QingKuai: the compiler uses TypeScript ${installation.version ?? "of unknown version"} ` +
                `from ${sourceDescription(installation)}, click to select another one`
        }
    }
}

function sourceDescription(installation: TypeScriptInstallation) {
    switch (installation.source) {
        case "setting":
            return "from qingkuai.typescriptPath"
        case "workspace":
            return "from the workspace"
        default:
            return "bundled with VS Code"
    }
}
