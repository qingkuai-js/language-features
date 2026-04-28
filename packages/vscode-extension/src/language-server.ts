import type { TsPluginQingkuaiConfig } from "../../../types/common"
import type { ConfigPluginParms, ConnectToTsServerParams } from "../../../types/communication"

import * as vscode from "vscode"

import nodeFs from "node:fs"
import nodeOs from "node:os"
import nodePath from "node:path"

import {
    Logger,
    client,
    setState,
    projectKind,
    outputChannel,
    serverModulePath,
    languageStatusItem,
    limitedScriptLanguageFeatures
} from "./state"
import {
    ServerOptions,
    TransportKind,
    LanguageClient,
    LanguageClientOptions
} from "vscode-languageclient/node"
import {
    getQingkuaiConfig,
    getExtensionConfig,
    startPrettierConfigWatcher,
    startQingkuaiConfigWatcher
} from "./config"
import { Messages } from "./messages"
import { attachCustomHandlers } from "./handler"
import { runAll } from "../../../shared-util/sundry"
import { attachFileSystemHandlers } from "./filesys"
import { isQingkuaiFileName } from "../../../shared-util/assert"
import { getValidPathWithHash } from "../../../shared-util/ipc/sock"
import { LS_HANDLERS, NOOP, ProjectKind } from "../../../shared-util/constant"

export async function activeLanguageServer() {
    languageStatusItem.busy = true

    const clientWatcher = vscode.workspace.createFileSystemWatcher("**/.clientrc")
    const languageServerOptions: ServerOptions = {
        args: ["--nolazy"],
        module: serverModulePath,
        transport: TransportKind.ipc
    }
    const languageClientOptions: LanguageClientOptions = {
        initializationOptions: {
            limitedScriptLanguageFeatures
        },
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
    languageServerOptions.options = {
        env: {
            ...process.env,
            LIMITED_SCRIPT: +limitedScriptLanguageFeatures
        }
    }
    await languageClient.start()
    await connectToTsServer()

    runAll([
        attachFileSystemHandlers,
        startQingkuaiConfigWatcher,
        startPrettierConfigWatcher,
        () => attachCustomHandlers(configTsServerPlugin)
    ])

    languageStatusItem.busy = false
}

async function configTsServerPlugin(isReconnect: boolean) {
    const activeDocument = vscode.window.activeTextEditor?.document
    const tsExtension = vscode.extensions.getExtension("vscode.typescript-language-features")
    const shouldWarmupTsServer = /\.(?:qk|qingkuairc)/.test(activeDocument?.uri.fsPath || "")
    setState({ limitedScriptLanguageFeatures: !tsExtension })

    if (!tsExtension) {
        return (Logger.warn(Messages.BuiltinTsExtensionDisabled), NOOP)
    }

    await tsExtension.activate()

    // 将本项目中qingkuai语言服务器与ts服务器插件间建立ipc通信的套接字/命名管道
    // 文件名配置到插件，getValidPathWithHash在非windows平台会清理过期sock文件
    const tsExtenstionAPI = tsExtension.exports.getAPI(0)

    if (shouldWarmupTsServer) {
        await warmupTsServer(tsExtenstionAPI)
    }

    const sockPath = await getValidPathWithHash("qingkuai")
    tsExtenstionAPI.configurePlugin("typescript-plugin-qingkuai", {
        sockPath,
        triggerFileName: activeDocument?.uri.fsPath || "",
        configurations: getInitQingkuaiConfigurations()
    } satisfies ConfigPluginParms)

    // 通知 qingkuai 语言服务器与 tsserver 创建 ipc 链接
    return () => {
        return client.sendRequest(LS_HANDLERS.ConnectToTsServer, {
            sockPath,
            isReconnect,
            projectKind
        } satisfies ConnectToTsServerParams)
    }
}

async function warmupTsServer(tsExtenstionAPI: any) {
    const warmupFilePath = nodePath.join(nodeOs.tmpdir(), `qingkuai-warmup-${Date.now()}.ts`)
    await nodeFs.promises.writeFile(warmupFilePath, "export {}\n", "utf-8")

    try {
        const warmupDoc = await vscode.workspace.openTextDocument(warmupFilePath)
        await vscode.commands.executeCommand(
            "vscode.executeCompletionItemProvider",
            warmupDoc.uri,
            new vscode.Position(0, 0)
        )

        if (typeof tsExtenstionAPI?.onReady === "function") {
            await tsExtenstionAPI.onReady()
        }
    } finally {
        void nodeFs.promises.unlink(warmupFilePath).catch(() => {})
    }

    Logger.info("TypeScript server warmup completed.")
}

// 获取初始化时由.qingkuairc配置文件定义的配置项
function getInitQingkuaiConfigurations() {
    const configurations: Record<string, TsPluginQingkuaiConfig> = {}
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
        const folderPath = folder.uri.fsPath
        for (let filePath of nodeFs.readdirSync(folderPath, { recursive: true })) {
            const fileName = nodePath.basename((filePath = filePath.toString()))
            if (
                projectKind !== ProjectKind.TS &&
                (fileName === "tscofig.json" || fileName.endsWith(".ts"))
            ) {
                setState({
                    projectKind: ProjectKind.TS
                })
            }
            if (isQingkuaiFileName(fileName)) {
                const fileAbsUri = vscode.Uri.file(nodePath.join(folderPath, filePath))
                const extensionConfig = getExtensionConfig(fileAbsUri)
                const qingkuaiConfig = getQingkuaiConfig(fileAbsUri)
                configurations[fileAbsUri.fsPath] = {
                    resolveImportExtension: qingkuaiConfig.resolveImportExtension,
                    hoverTipReactiveStatus: extensionConfig.hoverTipReactiveStatus
                }
            }
        }
    }
    return configurations
}
