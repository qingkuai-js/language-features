import type { ExtensionContext } from "vscode"
import type { ConfigPluginParms, ConnectToTsServerParams } from "../../../types/communication"

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
import { Messages } from "./messages"
import { QingkuaiCommands } from "./command"
import { attachCustomHandlers } from "./handler"
import { attachFileSystemHandlers } from "./filesys"
import { LSHandler } from "../../../shared-util/constant"
import { isQingkuaiFileName } from "../../../shared-util/assert"
import { client, Logger, outputChannel, setState } from "./state"
import { getValidPathWithHash } from "../../../shared-util/ipc/sock"

export function deactivate(): Thenable<void> | undefined {
    return client && client.stop()
}

export async function activate(context: ExtensionContext) {
    const activeDocument = vscode.window.activeTextEditor?.document
    if (isQingkuaiFileName(activeDocument?.uri.fsPath || "")) {
        return activeLanguageServer(context)
    }

    const disposable = vscode.workspace.onDidOpenTextDocument(document => {
        if (isQingkuaiFileName(document.uri.fsPath || "")) {
            activeLanguageServer(context)
            disposable.dispose()
        }
    })
}

export async function configTsServerPlugin(isReconnect: boolean) {
    const tsExtension = vscode.extensions.getExtension("vscode.typescript-language-features")
    if (!tsExtension) {
        setState({
            limitedScriptLanguageFeatures: true
        })
        Logger.warn(Messages.BuiltinTsExtensionDisabled)
        return client.sendNotification(LSHandler.disableScriptLanguageFeatures, null)
    }

    // 切换语言id以激活vscode内置ts扩展
    const activeDocument = vscode.window.activeTextEditor?.document
    if (activeDocument && !tsExtension.isActive) {
        const setLanguageIdOfTriggerDocument = async (id: string) => {
            await vscode.languages.setTextDocumentLanguage(activeDocument, id)
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
        configurations: await getInitQingkuaiConfig(),
        triggerFileName: activeDocument?.uri.fsPath || ""
    } satisfies ConfigPluginParms)

    // 通知qingkuai语言服务器与ts server创建ipc链接
    await client!.sendRequest(LSHandler.ConnectToTsServer, {
        sockPath,
        isReconnect
    } satisfies ConnectToTsServerParams)
}

async function activeLanguageServer(context: ExtensionContext) {
    const serverModule = context.asAbsolutePath("./dist/server.js")
    const watcher = vscode.workspace.createFileSystemWatcher("**/.clientrc")
    const languageStatusItem = vscode.languages.createLanguageStatusItem("ls", "qingkuai")

    // 开启插件加载状态
    languageStatusItem.text = "QingKuai Language Server"
    context.subscriptions.push(languageStatusItem)
    languageStatusItem.busy = true

    const commands = new QingkuaiCommands(outputChannel)
    languageStatusItem.command = {
        title: "View Logs",
        command: commands.viewServerLogs
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

    setState({
        client: new LanguageClient(
            "qingkuai",
            "QingKuai Language features",
            languageServerOptions,
            languageClientOptions
        )
    })
    await client.start()
    await configTsServerPlugin(false)

    attachCustomHandlers()
    attachFileSystemHandlers()
    startQingkuaiConfigWatcher()
    startPrettierConfigWatcher()
    languageStatusItem.busy = false
}
