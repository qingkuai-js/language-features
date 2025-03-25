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
import {
    Logger,
    client,
    setState,
    outputChannel,
    serverModulePath,
    languageStatusItem
} from "./state"
import * as vscode from "vscode"
import { Messages } from "./messages"
import { QingkuaiCommands } from "./command"
import { attachCustomHandlers } from "./handler"
import { runAll } from "../../../shared-util/sundry"
import { attachFileSystemHandlers } from "./filesys"
import { LSHandler } from "../../../shared-util/constant"
import { isQingkuaiFileName } from "../../../shared-util/assert"
import { getValidPathWithHash } from "../../../shared-util/ipc/sock"

export function deactivate(): Thenable<void> | undefined {
    return client && client.stop()
}

export async function activate(context: ExtensionContext) {
    const commands = new QingkuaiCommands(outputChannel, activeLanguageServer)
    const activeDocument = vscode.window.activeTextEditor?.document
    setState({
        serverModulePath: context.asAbsolutePath("./dist/server.js")
    })
    languageStatusItem.command = {
        title: "View Logs",
        command: commands.viewServerLogs
    }
    context.subscriptions.push(languageStatusItem)

    if (isQingkuaiFileName(activeDocument?.uri.fsPath || "")) {
        return activeLanguageServer()
    }

    const disposable = vscode.workspace.onDidOpenTextDocument(document => {
        if (isQingkuaiFileName(document.uri.fsPath || "")) {
            activeLanguageServer()
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
        return () => client.sendNotification(LSHandler.disableScriptLanguageFeatures, null)
    }

    // 切换语言id以激活vscode内置ts扩展
    const activeDocument = vscode.window.activeTextEditor?.document
    if (/\.(?:qk|qingkuairc)/.test(activeDocument?.uri.fsPath || "")) {
        const setLanguageIdOfTriggerDocument = async (id: string) => {
            await vscode.languages.setTextDocumentLanguage(activeDocument!, id)
        }
        await tsExtension.activate()
        await setLanguageIdOfTriggerDocument("typescript").then(() => {
            setLanguageIdOfTriggerDocument("qingkuai")
        })
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
    return () => {
        client!.sendNotification(LSHandler.ConnectToTsServer, {
            sockPath,
            isReconnect
        } satisfies ConnectToTsServerParams)
    }
}

async function activeLanguageServer() {
    languageStatusItem.busy = true

    const clientWatcher = vscode.workspace.createFileSystemWatcher("**/.clientrc")
    const languageServerOptions: ServerOptions = {
        args: ["--nolazy"],
        module: serverModulePath,
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
            fileEvents: clientWatcher
        },
        markdown: {
            isTrusted: true
        },
        outputChannel
    }

    const languageClient = new LanguageClient(
        "qingkuai",
        "QingKuai Language features",
        languageServerOptions,
        languageClientOptions
    )
    setState({ client: languageClient })

    const connectToTsServer = await configTsServerPlugin(false)
    await languageClient.start()

    runAll([
        connectToTsServer,
        attachFileSystemHandlers,
        startQingkuaiConfigWatcher,
        startPrettierConfigWatcher,
        () => attachCustomHandlers(configTsServerPlugin)
    ])

    languageStatusItem.busy = false
}
