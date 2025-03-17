import type {
    InsertSnippetParam,
    GetClientConfigParams,
    GetConfigurationParams
} from "../../../types/communication"
import type { LanguageClient, WorkspaceEdit } from "vscode-languageclient/node"

import {
    getExtensionConfig,
    getPrettierConfig,
    getTypescriptConfig,
    notifyServerCleanConfigCache
} from "./config"
import fs from "node:fs"
import * as vsc from "vscode"
import { LSHandler } from "../../../shared-util/constant"
import { isUndefined } from "../../../shared-util/assert"

export function attachCustomHandlers(client: LanguageClient) {
    // 活跃文档切换且新活跃文档的语言id为qingkuai时刷新诊断信息
    vsc.window.onDidChangeActiveTextEditor(textEditor => {
        if (textEditor?.document.languageId === "qingkuai") {
            client.sendNotification(
                LSHandler.publishDiagnostic,
                `file://${textEditor.document.uri.fsPath}`
            )
        }
    })

    // 监听扩展配置项变化，并通知qingkuai语言服务器
    vsc.workspace.onDidChangeConfiguration(({ affectsConfiguration }) => {
        if (
            affectsConfiguration("qingkuai") ||
            affectsConfiguration("prettier") ||
            affectsConfiguration("typescript") ||
            affectsConfiguration("javascript")
        ) {
            notifyServerCleanConfigCache(client)
        }
    })

    vsc.workspace.onDidRenameFiles(({ files }) => {
        for (const { oldUri, newUri } of files) {
            console.log(oldUri.fsPath, newUri.fsPath)
        }
    })

    // 插入片段通知，qingkuai语言服务器需要向当前编辑窗口插入文本片段时会发送此通知
    client.onNotification(LSHandler.insertSnippet, (params: InsertSnippetParam) => {
        vsc.window.activeTextEditor?.insertSnippet(new vsc.SnippetString(params.text))
        params.command && vsc.commands.executeCommand(params.command)
    })

    // 获取语言配置项
    client.onRequest(
        LSHandler.getLanguageConfig,
        async ({ filePath, scriptPartIsTypescript }: GetClientConfigParams) => {
            if (!fs.existsSync(filePath)) {
                return
            }

            const fileUri = vsc.Uri.file(filePath)
            const workspaceFolder = vsc.workspace.getWorkspaceFolder(fileUri)
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
        const config = vsc.workspace.getConfiguration(params.section, vsc.Uri.parse(params.uri))
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
    client.onNotification(LSHandler.applyWorkspaceEdit, (param: WorkspaceEdit) => {
        const changes = param.changes!
        const workspaceEdit = new vsc.WorkspaceEdit()
        Object.keys(changes).forEach(uri => {
            changes[uri].forEach(({ range, newText }) => {
                const vscodeRange = new vsc.Range(
                    new vsc.Position(range.start.line, range.start.character),
                    new vsc.Position(range.end.line, range.end.character)
                )
                workspaceEdit.replace(vsc.Uri.parse(uri), vscodeRange, newText)
            })
        })
        vsc.workspace.applyEdit(workspaceEdit)
    })
}
