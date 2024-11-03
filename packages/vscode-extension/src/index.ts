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
import { builtInTSExtenstionIsNotEnabled } from "./messages"

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

    // 激活vscode内置typescript-language-features插件，在qingkuai-typescript-plugin
    // 中会判断到如果是由qk文件触发的激活，则将qk源码文件从typescript语言服务项目中移除
    if (doc && doc.languageId === "qingkuai") {
        await vsc.languages.setTextDocumentLanguage(doc, "typescript")
        await vsc.languages.setTextDocumentLanguage(doc, "qingkuai")
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

    client = await new LanguageClient(
        "qingkuai",
        "QingKuai Language features",
        languageServerOptions,
        languageClientOptions
    )

    rmSockFile("qingkuai"), await client.start()

    // 如果vscode内置typescript-language-features扩展未被启用则提示警告信息
    // 如果此内置扩展已经启用，则将扩展加载完毕的通知发送到qingkuai语言服务器
    if (typescriptExtension?.isActive) {
        client.sendNotification("qingkuai/extensionLoaded")
    } else {
        const value = await vsc.window.showErrorMessage(
            builtInTSExtenstionIsNotEnabled,
            "Enable Now"
        )
        if (value === "Enable Now") {
            await typescriptExtension?.activate()
            vsc.commands.executeCommand("workbench.action.reloadWindow")
        }
    }
    attachCustomHandlers()
    languageStatusItem.busy = false
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
