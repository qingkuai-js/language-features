import type {
    InsertSnippetParams,
    GetClientConfigParams,
    ApplyWorkspaceEditParams,
    GetClientLanguageConfigParams,
    GetClientLanguageConfigResult
} from "../../../types/communication"
import type { ConfigTsServerPluginFunc } from "./types"

import * as vscode from "vscode"

import nodePath from "node:path"

import {
    getClientConfig,
    getQingkuaiConfig,
    getPrettierConfig,
    getExtensionConfig,
    getTypescriptConfig,
    notifyServerCleanConfigCache
} from "./config"
import { client } from "./state"
import { LS_HANDLERS } from "../../../shared-util/constant"

export function attachCustomHandlers(configTsServerPlugin: ConfigTsServerPluginFunc) {
    // 活跃文档切换且新活跃文档的语言 id 为 qingkuai 时刷新诊断信息
    vscode.window.onDidChangeActiveTextEditor(textEditor => {
        if (textEditor?.document.languageId === "qingkuai") {
            client.sendNotification(LS_HANDLERS.RefreshDiagnostic, textEditor.document.uri.fsPath)
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
            notifyServerCleanConfigCache()
        }
    })

    // ts server 服务器进程退出通知，尝试重连
    client.onNotification(LS_HANDLERS.TsServerIsKilled, async () => {
        client.isRunning() && configTsServerPlugin(true).then(c => c())
    })

    // 插入片段通知，qingkuai 语言服务器需要向当前编辑窗口插入文本片段时会发送此通知
    client.onNotification(LS_HANDLERS.InsertSnippet, (params: InsertSnippetParams) => {
        vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(params.text))
        params.command && vscode.commands.executeCommand(params.command)
    })

    // 获取语言配置项
    client.onRequest(
        LS_HANDLERS.GetLanguageConfig,
        async ({ filePath, scriptLanguageId: scriptLanguageId }: GetClientLanguageConfigParams) => {
            const fileUri = vscode.Uri.file(filePath)
            return {
                dirPath: nodePath.dirname(filePath),
                qingkuaiConfig: getQingkuaiConfig(fileUri),
                extensionConfig: getExtensionConfig(fileUri),
                prettierConfig: await getPrettierConfig(fileUri),
                typescriptConfig: getTypescriptConfig(fileUri, scriptLanguageId)
            } satisfies GetClientLanguageConfigResult
        }
    )

    // 获取客户端配置
    client.onRequest(LS_HANDLERS.GetClientConfig, (params: GetClientConfigParams) => {
        const uri = vscode.Uri.parse(params.uri)
        if ("includes" in params) {
            return (
                params.includes?.reduce(
                    (ret, key) => {
                        return {
                            ...ret,
                            [key]: getClientConfig(uri, params.section, key)
                        }
                    },
                    {} as Record<string, any>
                ) ?? {}
            )
        }
        if ("name" in params) {
            return getClientConfig(uri, params.section, params.name)
        }
        return vscode.workspace.getConfiguration(params.section, uri)
    })

    // 应用工作区更改
    client.onNotification(LS_HANDLERS.ApplyWorkspaceEdit, (edits: ApplyWorkspaceEditParams) => {
        const workspaceEdit = new vscode.WorkspaceEdit()
        edits.forEach(editItem => {
            editItem.changes.forEach(change => {
                workspaceEdit.replace(
                    vscode.Uri.file(editItem.fileName),
                    new vscode.Range(
                        new vscode.Position(change.range.start.line, change.range.start.character),
                        new vscode.Position(change.range.end.line, change.range.end.character)
                    ),
                    change.newText
                )
            })
        })
        vscode.workspace.applyEdit(workspaceEdit, {
            isRefactoring: true
        })
    })
}
