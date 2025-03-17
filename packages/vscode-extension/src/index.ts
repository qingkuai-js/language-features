import type { ExtensionContext } from "vscode"

import {
    getInitQingkuaiConfig,
    startPrettierConfigWatcher,
    startQingkuaiConfigWatcher
} from "./config"
import {
    ServerOptions,
    TransportKind,
    LanguageClient,
    LanguageClientOptions
} from "vscode-languageclient/node"
import * as vsc from "vscode"
import { QingkuaiCommands } from "./command"
import { attachCustomHandlers } from "./handler"
import { LSHandler } from "../../../shared-util/constant"
import { isQingkuaiFileName } from "../../../shared-util/assert"
import { getValidPathWithHash } from "../../../shared-util/ipc/sock"

let client: LanguageClient | undefined = undefined

export async function activate(context: ExtensionContext) {
    if (isQingkuaiFileName(vsc.window.activeTextEditor?.document.uri.fsPath || "")) {
        return activeLanguageServer(context)
    }

    const disposable = vsc.window.onDidChangeActiveTextEditor(e => {
        if (isQingkuaiFileName(e?.document.uri.fsPath || "")) {
            disposable.dispose()
            activeLanguageServer(context)
        }
    })
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined
    }
    return client.stop()
}

async function activeLanguageServer(context: ExtensionContext) {
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

    const commands = new QingkuaiCommands(outputChannel)
    languageStatusItem.command = {
        title: "View Logs",
        command: commands.viewServerLogs
    }

    // 切换语言id以激活vscode内置ts服务器
    if ((await tsExtension.activate()) && shouldToggleLanguageId) {
        await vsc.languages.setTextDocumentLanguage(doc, "typescript")
    }

    // 将本项目中qingkuai语言服务器与ts服务器插件间建立ipc通信的套接字/命名管道
    // 文件名配置到插件，getValidPathWithHash在非windows平台会清理过期sock文件
    const tsExtenstionAPI = tsExtension.exports.getAPI(0)
    const sockPath = await getValidPathWithHash("qingkuai")
    tsExtenstionAPI.configurePlugin("typescript-plugin-qingkuai", {
        sockPath,
        configurations: await getInitQingkuaiConfig(),
        triggerFileName: shouldToggleLanguageId ? doc.fileName : ""
    })

    if (shouldToggleLanguageId) {
        vsc.languages.setTextDocumentLanguage(doc, "qingkuai")
    }

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
        markdown: {
            isTrusted: true
        },
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

    attachCustomHandlers(client)
    languageStatusItem.busy = false
    startQingkuaiConfigWatcher(client)
    startPrettierConfigWatcher(client)
    client.sendRequest(LSHandler.languageClientCreated, sockPath)
}
