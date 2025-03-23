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
import * as vscode from "vscode"
import { QingkuaiCommands } from "./command"
import { attachCustomHandlers } from "./handler"
import { attachFileSystemHandlers } from "./filesys"
import { LSHandler } from "../../../shared-util/constant"
import { isQingkuaiFileName } from "../../../shared-util/assert"
import { getValidPathWithHash } from "../../../shared-util/ipc/sock"

let client: LanguageClient | undefined = undefined

export async function activate(context: ExtensionContext) {
    const activeDocument = vscode.window.activeTextEditor?.document
    if (isQingkuaiFileName(activeDocument?.uri.fsPath || "")) {
        return activeLanguageServer(context, activeDocument!)
    }

    const disposable = vscode.workspace.onDidOpenTextDocument(document => {
        if (isQingkuaiFileName(document.uri.fsPath || "")) {
            activeLanguageServer(context, document)
            disposable.dispose()
        }
    })
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined
    }
    return client.stop()
}

async function activeLanguageServer(
    context: ExtensionContext,
    triggerDocument: vscode.TextDocument
) {
    const serverModule = context.asAbsolutePath("./dist/server.js")
    const watcher = vscode.workspace.createFileSystemWatcher("**/.clientrc")
    const outputChannel = vscode.window.createOutputChannel("QingKuai", "log")
    const languageStatusItem = vscode.languages.createLanguageStatusItem("ls", "qingkuai")
    const tsExtension = vscode.extensions.getExtension("vscode.typescript-language-features")!
    // 开启插件加载状态
    languageStatusItem.text = "QingKuai Language Server"
    context.subscriptions.push(languageStatusItem)
    languageStatusItem.busy = true

    const commands = new QingkuaiCommands(outputChannel)
    languageStatusItem.command = {
        title: "View Logs",
        command: commands.viewServerLogs
    }

    // 切换语言id以激活vscode内置ts扩展
    if (!tsExtension.isActive) {
        const setLanguageIdOfTriggerDocument = async (id: string) => {
            await vscode.languages.setTextDocumentLanguage(triggerDocument, id)
        }
        await setLanguageIdOfTriggerDocument("typescript")
        await tsExtension.activate(), setLanguageIdOfTriggerDocument("qingkuai")
    }

    // 将本项目中qingkuai语言服务器与ts服务器插件间建立ipc通信的套接字/命名管道
    // 文件名配置到插件，getValidPathWithHash在非windows平台会清理过期sock文件
    const tsExtenstionAPI = tsExtension.exports.getAPI(0)
    const sockPath = await getValidPathWithHash("qingkuai")
    tsExtenstionAPI.configurePlugin("typescript-plugin-qingkuai", {
        sockPath,
        triggerFileName: triggerDocument.uri.fsPath,
        configurations: await getInitQingkuaiConfig()
    })

    if (triggerDocument.languageId !== "qingkuai") {
        vscode.languages.setTextDocumentLanguage(triggerDocument, "qingkuai")
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

    languageStatusItem.busy = false

    attachCustomHandlers(client)
    attachFileSystemHandlers(client)
    startQingkuaiConfigWatcher(client)
    startPrettierConfigWatcher(client)
    client.sendRequest(LSHandler.LanguageClientCreated, sockPath)
}
