import type { ExtensionContext } from "vscode"
import { RetransmissionParams, type InsertSnippetParam } from "../../../types/communication"
import type { QingkuaiConfiguration, QingkuaiConfigurationWithDir } from "../../../types/common"

import fs from "fs"
import path from "path"

import * as vsc from "vscode"

import {
    ServerOptions,
    TransportKind,
    LanguageClient,
    LanguageClientOptions
} from "vscode-languageclient/node"
import { isString, isUndefined } from "../../../shared-util/assert"
import { getValidPathWithHash } from "../../../shared-util/ipc/sock"

let client: LanguageClient

export async function activate(context: ExtensionContext) {
    const doc = vsc.window.activeTextEditor!.document
    const extensionConfiguration = getExtensionConfiguration()
    const shouldToggleLanguageId = doc.languageId === "qingkuai"
    const qingkuaiConfigurations: QingkuaiConfigurationWithDir[] = []
    const serverModule = context.asAbsolutePath("../../dist/server.js")
    const outputChannel = vsc.window.createOutputChannel("QingKuai", "log")
    const clientWatcher = vsc.workspace.createFileSystemWatcher("**/.clientrc")
    const languageStatusItem = vsc.languages.createLanguageStatusItem("ls", "qingkuai")
    const tsExtension = vsc.extensions.getExtension("vscode.typescript-language-features")!

    // 查找所有已存在的配置文件
    vsc.workspace.workspaceFolders?.forEach(folder => {
        const folderPath = folder.uri.path
        fs.readdirSync(folderPath, {
            recursive: true
        }).forEach(filePath => {
            if (isString(filePath) && filePath.endsWith(".qingkuairc")) {
                const fileAbsPath = path.join(folderPath, filePath)
                const config = loadConfiguration(fileAbsPath)
                if (!isUndefined(config)) {
                    qingkuaiConfigurations.push({
                        ...config,
                        dir: folderPath
                    })
                }
            }
        })
    })

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
        configurations: qingkuaiConfigurations
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
            fileEvents: clientWatcher
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
    client.sendRequest("qingkuai/extensionLoaded", {
        sockPath,
        configuration: extensionConfiguration
    })
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined
    }
    return client.stop()
}

// 获取扩展配置项
function getExtensionConfiguration() {
    const config = {
        ...vsc.workspace.getConfiguration("qingkuai")
    }
    Object.keys(config).forEach(key => {
        if (key === "htmlHoverTip") {
            config[key] = Array.from(new Set(config[key]))
        }
    })
    return config
}

// 添加自定义请求/通知处理程序
function attachCustomHandlers() {
    const configWatcher = vsc.workspace.createFileSystemWatcher("**/.qingkuairc", true)

    // 监听工作区范围内配置文件的创建、修改、删除事件
    configWatcher.onDidChange((uri: vsc.Uri) => {
        client.sendNotification("qingkuai/retransmission", {
            name: "updateConfig",
            data: {
                dir: path.dirname(uri.path),
                ...loadConfiguration(uri.path)
            }
        } satisfies RetransmissionParams)
    })

    configWatcher.onDidDelete((uri: vsc.Uri) => {
        client.sendNotification("qingkuai/retransmission", {
            name: "deleteConfig",
            data: path.dirname(uri.path)
        } satisfies RetransmissionParams)
    })

    // 活跃文档切换且新活跃文档的语言id为qingkuai时刷新诊断信息
    vsc.window.onDidChangeActiveTextEditor(textEditor => {
        if (textEditor?.document.languageId === "qingkuai") {
            client.sendNotification(
                "qingkuai/publishDiagnostics",
                `file://${textEditor.document.uri.fsPath}`
            )
        }
    })

    // 插入片段通知，qingkuai语言服务器需要向当前编辑窗口插入文本片段时会发送此通知
    client.onNotification("qingkuai/insertSnippet", (params: InsertSnippetParam) => {
        vsc.window.activeTextEditor?.insertSnippet(new vsc.SnippetString(params.text))
        params.command && vsc.commands.executeCommand(params.command)
    })

    // 监听扩展配置项变化，并发送最新的配置内容到qingkuai语言服务器
    vsc.workspace.onDidChangeConfiguration(() => {
        client.sendNotification("qingkuai/updateExtensionConfig", getExtensionConfiguration())
    })
}

// 读取指定路径(.qingkuairc)的配置文件内容
async function loadConfiguration(path: string) {
    try {
        return JSON.parse(fs.readFileSync(path, "utf-8") || "{}") as QingkuaiConfiguration
    } catch {
        const value = await vsc.window.showWarningMessage(
            `Load configuration from "${path}" is failed, please check its contents.`,
            "Open Config File"
        )
        if (value === "Open Config File") {
            const document = await vsc.workspace.openTextDocument(path)
            vsc.window.showTextDocument(document)
        }
    }
}
