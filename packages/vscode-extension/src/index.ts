import type { ExtensionContext } from "vscode"
import type { GetClientConfigParams, InsertSnippetParam } from "../../../types/communication"

import {
    ServerOptions,
    TransportKind,
    LanguageClient,
    LanguageClientOptions
} from "vscode-languageclient/node"
import {
    getExtensionConfig,
    getTypescriptConfig,
    getInitQingkuaiConfig,
    startQingkuaiConfigWatcher
} from "./config"
import fs from "fs"
import * as vsc from "vscode"
import { isUndefined } from "../../../shared-util/assert"
import { getValidPathWithHash } from "../../../shared-util/ipc/sock"

let client: LanguageClient

export async function activate(context: ExtensionContext) {
    const doc = vsc.window.activeTextEditor!.document
    const shouldToggleLanguageId = doc.languageId === "qingkuai"
    const serverModule = context.asAbsolutePath("../../dist/server.js")
    const watcher = vsc.workspace.createFileSystemWatcher("**/.clientrc")
    const outputChannel = vsc.window.createOutputChannel("QingKuai", "log")
    const languageStatusItem = vsc.languages.createLanguageStatusItem("ls", "qingkuai")
    const tsExtension = vsc.extensions.getExtension("vscode.typescript-language-features")!

    // 开启插件加载状态
    languageStatusItem.text = "QingKuai Language Server"
    context.subscriptions.push(languageStatusItem)
    languageStatusItem.busy = true

    vsc.commands.registerCommand("qingkuai.viewLanguageServerLogs", () => {
        outputChannel.show()
    })
    languageStatusItem.command = {
        title: "View Logs",
        command: "qingkuai.viewLanguageServerLogs"
    }

    // 切换语言id以激活vscode内置ts服务器
    if ((await tsExtension.activate()) && shouldToggleLanguageId) {
        await vsc.languages.setTextDocumentLanguage(doc, "typescript")
    }

    // 将本项目中qingkuai语言服务器与ts服务器插件间建立ipc通信的套接字/命名管道
    // 文件名配置到插件，getValidPathWithHash在非windows平台会清理过期sock文件
    const pluginName = "typescript-qingkuai-plugin"
    const tsExtenstionAPI = tsExtension.exports.getAPI(0)
    const sockPath = await getValidPathWithHash("qingkuai")
    tsExtenstionAPI.configurePlugin(pluginName, {
        sockPath,
        configurations: getInitQingkuaiConfig()
    })
    vsc.languages.setTextDocumentLanguage(doc, "qingkuai")

    const languageServerOptions: ServerOptions = {
        args: ["--nolazy"],
        module: serverModule,
        transport: TransportKind.ipc
    }
    const languageClientOptions: LanguageClientOptions = {
        documentSelector: [
            {
                scheme: "file",
                language: "qingkuai"
            }
        ],
        synchronize: {
            fileEvents: watcher
        },
        outputChannel
    }

    await (client = await new LanguageClient(
        "qingkuai",
        "QingKuai Language features",
        languageServerOptions,
        languageClientOptions
    )).start()

    attachCustomHandlers()
    languageStatusItem.busy = false
    startQingkuaiConfigWatcher(client)
    client.sendRequest("qingkuai/extensionLoaded", sockPath)
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined
    }
    return client.stop()
}

// 添加自定义请求/通知处理程序
function attachCustomHandlers() {
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
                workspaceFolder,
                extensionConfig: getExtensionConfig(fileUri),
                typescriptConfig: getTypescriptConfig(fileUri, scriptPartIsTypescript)
            }
        }
    )
}
