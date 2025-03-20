import type {
    InsertSnippetParam,
    GetClientConfigParams,
    GetConfigurationParams,
    ApplyWorkspaceEditParams
} from "../../../types/communication"
import type { LanguageClient } from "vscode-languageclient/node"

import {
    getConfigTarget,
    getPrettierConfig,
    getExtensionConfig,
    getTypescriptConfig,
    notifyServerCleanConfigCache
} from "./config"
import fs from "node:fs"
import * as vscode from "vscode"
import { LSHandler } from "../../../shared-util/constant"
import { isUndefined } from "../../../shared-util/assert"

export function attachCustomHandlers(client: LanguageClient) {
    // 活跃文档切换且新活跃文档的语言id为qingkuai时刷新诊断信息
    vscode.window.onDidChangeActiveTextEditor(textEditor => {
        if (textEditor?.document.languageId === "qingkuai") {
            client.sendNotification(
                LSHandler.publishDiagnostic,
                `file://${textEditor.document.uri.fsPath}`
            )
        }
    })

    // 监听扩展配置项变化，并通知qingkuai语言服务器
    vscode.workspace.onDidChangeConfiguration(({ affectsConfiguration }) => {
        if (
            affectsConfiguration("qingkuai") ||
            affectsConfiguration("prettier") ||
            affectsConfiguration("typescript") ||
            affectsConfiguration("javascript")
        ) {
            notifyServerCleanConfigCache(client)
        }
    })

    // 插入片段通知，qingkuai语言服务器需要向当前编辑窗口插入文本片段时会发送此通知
    client.onNotification(LSHandler.insertSnippet, (params: InsertSnippetParam) => {
        vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(params.text))
        params.command && vscode.commands.executeCommand(params.command)
    })

    // 获取语言配置项
    client.onRequest(
        LSHandler.getLanguageConfig,
        async ({ filePath, scriptPartIsTypescript }: GetClientConfigParams) => {
            if (!fs.existsSync(filePath)) {
                return
            }

            const fileUri = vscode.Uri.file(filePath)
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri)
            if (isUndefined(workspaceFolder)) {
                return
            }

            return {
                workspacePath: workspaceFolder.uri.fsPath,
                extensionConfig: getExtensionConfig(fileUri),
                prettierConfig: await getPrettierConfig(fileUri),
                typescriptConfig: getTypescriptConfig(fileUri, scriptPartIsTypescript)
            }
        }
    )

    // 获取客户端配置
    client.onRequest(LSHandler.getClientConfig, (params: GetConfigurationParams) => {
        const config = vscode.workspace.getConfiguration(
            params.section,
            vscode.Uri.parse(params.uri)
        )
        if ("filter" in params) {
            const needKeys = new Set(params.filter)
            return Object.keys(config).reduce((ret, key) => {
                if (!needKeys.has(key)) {
                    return ret
                }
                return { ...ret, [key]: config[key] }
            }, {} as any)
        } else if ("name" in params) {
            return config.get(params.name, params.defaultValue)
        }
        return config
    })

    // 应用工作区更改
    client.onNotification(LSHandler.applyWorkspaceEdit, (param: ApplyWorkspaceEditParams) => {
        const changes = param.edit.changes!
        const targetUris = Object.keys(changes)
        const workspaceEdit = new vscode.WorkspaceEdit()
        const filesConfig = vscode.workspace.getConfiguration("files")
        targetUris.forEach(uri => {
            changes[uri].forEach(({ range, newText }) => {
                const vscodeUri = vscode.Uri.parse(uri)
                const vscodeRange = new vscode.Range(
                    new vscode.Position(range.start.line, range.start.character),
                    new vscode.Position(range.end.line, range.end.character)
                )
                workspaceEdit.replace(vscodeUri, vscodeRange, newText)
            })
        })

        // 应用工作区修改前修改自动保存配置，并在应用完成后修改会原始值
        const originalAutoSaveConfig = filesConfig.get("autoSave")
        const autoSaveConfigTarget = getConfigTarget(filesConfig, "autoSave")
        filesConfig.update("autoSave", "afterDelay", autoSaveConfigTarget)
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Window,
                title: param.message || "Workspace changes is being applied"
            },
            async () => {
                await vscode.workspace.applyEdit(workspaceEdit, {
                    isRefactoring: !!param.isRefactoring
                })
                filesConfig.update("autoSave", originalAutoSaveConfig, autoSaveConfigTarget)
            }
        )
    })
}
