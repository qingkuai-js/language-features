import type {
    InsertSnippetParams,
    GetClientConfigParams,
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
    getTypescriptConfig
} from "./config"
import { Messages } from "./messages"
import { LS_HANDLERS } from "../../../shared-util/constant"
import { Logger, client, disposables, workspaceReadyResolver } from "./state"

export function attachVscodeEventHandlers() {
    // 活跃文档切换且新活跃文档的语言 id 为 qingkuai 时刷新诊断信息
    disposables.push(
        vscode.window.onDidChangeActiveTextEditor(textEditor => {
            if (textEditor?.document.languageId === "qingkuai") {
                client.sendNotification(LS_HANDLERS.RefreshDiagnostic, false)
            }
        })
    )
}

export function attachCustomHandlers(configTsServerPlugin: ConfigTsServerPluginFunc) {
    disposables.push(
        // 语言服务器工作区就绪通知
        client.onNotification(LS_HANDLERS.WorkspaceReady, () => {
            Logger.info(Messages.WorkspaceReady)
            workspaceReadyResolver()
        }),

        // ts server 服务器进程退出通知，尝试重连
        client.onNotification(LS_HANDLERS.TsServerIsKilled, async () => {
            client.isRunning() && configTsServerPlugin(true).then(c => c())
        }),

        // 向指定文档插入文本片段的通知
        client.onNotification(LS_HANDLERS.InsertSnippet, (params: InsertSnippetParams) => {
            // 带 uri 时精确定位目标编辑器；否则插入到活跃编辑器
            const editor = params.uri
                ? vscode.window.visibleTextEditors.find(
                      e => e.document.uri.toString() === params.uri
                  )
                : vscode.window.activeTextEditor

            // 内容基于旧版本缓冲计算且文档已被编辑过时丢弃，防止插入与当前内容错配
            const staled =
                editor !== undefined &&
                params.version !== undefined &&
                editor.document.version !== params.version
            if (editor && !staled) {
                editor.insertSnippet(new vscode.SnippetString(params.text))
            }
            params.command && vscode.commands.executeCommand(params.command)
        }),

        // 获取语言配置项
        client.onRequest(LS_HANDLERS.GetLanguageConfig, async (filePath: string) => {
            const fileUri = vscode.Uri.file(filePath)
            return {
                dirPath: nodePath.dirname(filePath),
                qingkuaiConfig: getQingkuaiConfig(fileUri),
                extensionConfig: getExtensionConfig(fileUri),
                typescriptConfig: getTypescriptConfig(fileUri),
                prettierConfig: await getPrettierConfig(fileUri)
            } satisfies GetClientLanguageConfigResult
        }),

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
    )
}
