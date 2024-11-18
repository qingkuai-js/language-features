import {
    ServerOptions,
    TransportKind,
    LanguageClient,
    LanguageClientOptions
} from "vscode-languageclient/node"
import type { ExtensionContext } from "vscode"
import type { InsertSnippetParam } from "../../../types/communication"

import * as vsc from "vscode"
import { getValidPathWithHash } from "../../../shared-util/ipc/sock"

let client: LanguageClient

export async function activate(context: ExtensionContext) {
    const doc = vsc.window.activeTextEditor!.document
    const serverModule = context.asAbsolutePath("../../dist/server.js")
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

    // 通过切换语言id激活vscode内置ts扩展服务器
    await tsExtension.activate()
    await vsc.languages.setTextDocumentLanguage(doc, "typescript")
    await vsc.languages.setTextDocumentLanguage(doc, "qingkuai")

    const languageServerOptions: ServerOptions = {
        args: ["--nolazy"],
        module: serverModule,
        transport: TransportKind.ipc
    }

    const languageClientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: "file", language: "qingkuai" }],
        synchronize: {
            fileEvents: vsc.workspace.createFileSystemWatcher("**/.clientrc")
        },
        outputChannel
    }

    await (client = await new LanguageClient(
        "qingkuai",
        "QingKuai Language features",
        languageServerOptions,
        languageClientOptions
    )).start()

    // 将本项目中qingkuai语言服务器与ts服务器插件间建立ipc通信的套接字/命名管道
    // 文件名配置到插件，getValidPathWithHash在非windows平台会清理过期sock文件
    const tsapi = tsExtension.exports.getAPI(0)
    const sockPath = await getValidPathWithHash("qingkuai")
    tsapi.configurePlugin("typescript-qingkuai-plugin", { sockPath })

    attachCustomHandlers()
    languageStatusItem.busy = false
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
    client.onNotification("qingkuai/insertSnippet", (params: InsertSnippetParam) => {
        vsc.window.activeTextEditor?.insertSnippet(new vsc.SnippetString(params.text))
        params.command && vsc.commands.executeCommand(params.command)
    })
}
