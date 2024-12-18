import type { LanguageClient } from "vscode-languageclient/node"
import type { GetClientConfigParams, InsertSnippetParam } from "../../../types/communication"

import fs from "fs"
import * as vsc from "vscode"
import { isUndefined } from "../../../shared-util/assert"
import { getExtensionConfig, getTypescriptConfig } from "./config"

export function attachCustomHandlers(client: LanguageClient) {
    // 活跃文档切换且新活跃文档的语言id为qingkuai时刷新诊断信息
    vsc.window.onDidChangeActiveTextEditor(textEditor => {
        if (textEditor?.document.languageId === "qingkuai") {
            client.sendNotification(
                "qingkuai/publishDiagnostics",
                `file://${textEditor.document.uri.fsPath}`
            )
        }
    })

    // 监听扩展配置项变化，并通知qingkuai语言服务器
    vsc.workspace.onDidChangeConfiguration(() => {
        client.sendNotification("qingkuai/updateExtensionConfig", null)
    })

    // 插入片段通知，qingkuai语言服务器需要向当前编辑窗口插入文本片段时会发送此通知
    client.onNotification("qingkuai/insertSnippet", (params: InsertSnippetParam) => {
        vsc.window.activeTextEditor?.insertSnippet(new vsc.SnippetString(params.text))
        params.command && vsc.commands.executeCommand(params.command)
    })

    // 获取typescript配置
    client.onRequest(
        "qingkuai/getClientConfig",
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
                typescriptConfig: getTypescriptConfig(fileUri, scriptPartIsTypescript)
            }
        }
    )
}
