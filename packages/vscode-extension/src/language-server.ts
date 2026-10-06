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
    disposables,
    projectKind,
    outputChannel,
    serverModulePath,
    languageStatusItem,
    limitedScriptLanguageFeatures
} from "./state"
import {
    TransportKind,
    LanguageClient,
    Middleware,
    ServerOptions,
    LanguageClientOptions
} from "vscode-languageclient/node"
import { Messages } from "./messages"
import { startConfigWatcher } from "./config"
import { inspect } from "../../../shared-util/log"
import { attachFileSystemHandlers } from "./filesys"
import { isQingkuaiFileName } from "../../../shared-util/assert"
import { LS_HANDLERS, NOOP } from "../../../shared-util/constant"
import { getValidPathWithHash } from "../../../shared-util/ipc/sock"
import { generatePromiseAndResolver } from "../../../shared-util/sundry"
import { attachCustomHandlers, attachVscodeEventHandlers } from "./handler"

export async function activeLanguageServer() {
    languageStatusItem.busy = true

    // 每次激活都重置工作区就绪 Promise，等待本次语言服务器发出就绪通知后解决
    const [readyPromise, readyResolver] = generatePromiseAndResolver()
    setState({
        workspaceReadyPromise: readyPromise,
        workspaceReadyResolver: readyResolver
    })

    const clientWatcher = vscode.workspace.createFileSystemWatcher("**/.clientrc")
    disposables.push(clientWatcher)

    const languageServerOptions: ServerOptions = {
        run: {
            module: serverModulePath,
            transport: TransportKind.ipc
        },
        debug: {
            options: {
                execArgv: ["--nolazy"]
            },
            module: serverModulePath,
            transport: TransportKind.ipc
        }
    }
    const languageClientOptions: LanguageClientOptions = {
        initializationOptions: {
            limitedScriptLanguageFeatures
        },
        middleware: createStaleResponseGuard(),
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
    attachCustomHandlers(configTsServerPlugin)

    const connectToTsServer = await configTsServerPlugin(false)
    const serverProcessOptions = {
        env: {
            ...process.env,
            LIMITED_SCRIPT: +limitedScriptLanguageFeatures
        }
    }
    languageServerOptions.debug.options = {
        ...serverProcessOptions,
        ...languageServerOptions.debug.options
    }
    languageServerOptions.run.options = serverProcessOptions
    await languageClient.start()
    await connectToTsServer()
    startConfigWatcher()
    attachFileSystemHandlers()
    attachVscodeEventHandlers()
    languageStatusItem.busy = false
}

async function configTsServerPlugin(isReconnect: boolean) {
    const activeDocument = vscode.window.activeTextEditor?.document
    const activeBase = nodePath.basename(activeDocument?.uri.fsPath ?? "")
    const tsExtension = vscode.extensions.getExtension("vscode.typescript-language-features")
    const shouldWarmupTsServer = isQingkuaiFileName(activeBase) || activeBase === ".qingkuairc"
    setState({ limitedScriptLanguageFeatures: !tsExtension })

    if (!tsExtension) {
        return (Logger.warn(Messages.BuiltinTsExtensionDisabled), NOOP)
    }

    await tsExtension.activate()

    // 将本项目中qingkuai语言服务器与ts服务器插件间建立ipc通信的套接字/命名管道
    // 文件名配置到插件，getValidPathWithHash在非windows平台会清理过期sock文件
    const tsExtenstionAPI = tsExtension.exports.getAPI(1) || tsExtension.exports.getAPI(0)

    const sockPath = await getValidPathWithHash("qingkuai")
    const pluginConfig: ConfigPluginParms = {
        sockPath,
        triggerFileName: activeDocument?.uri.fsPath || ""
    }

    if (shouldWarmupTsServer) {
        const warmupPath = await warmupTsServer(tsExtenstionAPI)
        if (warmupPath) {
            pluginConfig.warmupFilePath = warmupPath
        }
    }

    try {
        tsExtenstionAPI.configurePlugin("typescript-plugin-qingkuai", pluginConfig)
    } catch (error) {
        Logger.error(`TypeScript extension configurePlugin failed.\n${inspect(error)}`)
        throw error
    }

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
        // 创建并打开文档，触发 TS server 启动并加载插件
        const warmupDoc = await vscode.workspace.openTextDocument(warmupFilePath)
        await vscode.commands.executeCommand(
            "vscode.executeCompletionItemProvider",
            warmupDoc.uri,
            new vscode.Position(0, 0)
        )

        if (typeof tsExtenstionAPI?.onReady === "function") {
            await tsExtenstionAPI.onReady()
        }
    } catch {
        nodeFs.promises.unlink(warmupFilePath).catch(NOOP)
        return
    }
    Logger.info("TypeScript server warmup completed.")
    return warmupFilePath
}

// 请求在途期间文档被编辑过（版本变化），响应坐标基于旧缓冲，应用到新缓冲会写坏
// 文件或错位渲染；此类响应一律丢弃。补全/签名等键入驱动的特性不在此列：它们的
// 请求天然逐键过期，由 VSCode 自身的刷新周期消化
function createStaleResponseGuard(): Middleware {
    const isStaled = (uri: vscode.Uri, versionBefore: number) => {
        const live = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString())
        return live === undefined || live.version !== versionBefore
    }

    return {
        provideRenameEdits: async (document, position, newName, token, next) => {
            const version = document.version
            const result = await next(document, position, newName, token)
            return isStaled(document.uri, version) ? null : result
        },
        provideDocumentFormattingEdits: async (document, options, token, next) => {
            const version = document.version
            const result = await next(document, options, token)
            return isStaled(document.uri, version) ? null : result
        },
        provideDocumentRangeFormattingEdits: async (document, range, options, token, next) => {
            const version = document.version
            const result = await next(document, range, options, token)
            return isStaled(document.uri, version) ? null : result
        },
        provideInlayHints: async (document, viewPort, token, next) => {
            const version = document.version
            const result = await next(document, viewPort, token)
            return isStaled(document.uri, version) ? [] : result
        }
    }
}
