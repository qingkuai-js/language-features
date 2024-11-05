import {
    ServerOptions,
    TransportKind,
    LanguageClient,
    LanguageClientOptions
} from "vscode-languageclient/node"
import type { ExtensionContext } from "vscode"
import type { InsertSnippetParam } from "../../../types/communication"

import * as vsc from "vscode"
import { rmSockFile } from "../../../shared-util/ipc/sock"

let client: LanguageClient

export async function activate(context: ExtensionContext) {
    const doc = vsc.window.activeTextEditor?.document
    const serverModule = context.asAbsolutePath("../../dist/server.js")
    const outputChannel = vsc.window.createOutputChannel("QingKuai", "log")
    const languageStatusItem = vsc.languages.createLanguageStatusItem("ls", "qingkuai")
    const typescriptExtension = vsc.extensions.getExtension("vscode.typescript-language-features")

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

    // 通过切换语言id来激活vscode内置typescript-language-features插件
    if (doc && doc.languageId === "qingkuai" && !typescriptExtension?.isActive) {
        await vsc.languages.setTextDocumentLanguage(doc, "typescript")
        rmSockFile("qingkuai"), await typescriptExtension?.activate()
        vsc.languages.setTextDocumentLanguage(doc, "qingkuai")
    }

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

    attachCustomHandlers()
    languageStatusItem.busy = false
    client.sendNotification("qingkuai/extensionLoaded")
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
