import type { GeneralFunc } from "../../../types/util"
import type { OpenFileParams } from "../../../types/common"
import type { QingkuaiCommandTypes } from "../../../types/command"

import * as vscode from "vscode"

import nodeFs from "node:fs"

import { runAll, sleep } from "../../../shared-util/sundry"
import { client, disposables, workspaceReadyPromise } from "./state"
import { listTypeScriptInstallations, resolveTypeScript } from "./typescript"

export class QingkuaiCommands {
    public showReferences = "qingkuai.showReferences"
    public openFileByPath = "qingkuai.openFileByFilePath"
    public viewServerLogs = "qingkuai.viewLanguageServerLogs"
    public waitForWorkspaceReady = "qingkuai.waitForWorkspaceReady"
    public restartLanguageServer = "qingkuai.restartLanguageServer"
    public selectTypeScriptPath = "qingkuai.selectTypeScriptPath"

    constructor(outputChannel: vscode.OutputChannel, activeLanguageServer: GeneralFunc) {
        disposables.push(
            // 查看 qingkuai 语言服务器日志
            vscode.commands.registerCommand(this.viewServerLogs, () => {
                outputChannel.show()
            }),

            // 选择 qingkuai 编译器使用的 typescript：可直接选探测到的安装，也可浏览指定
            vscode.commands.registerCommand(this.selectTypeScriptPath, async () => {
                await selectTypeScriptPath()
            }),

            // 语言服务器实际使用的 typescript 信息（类型面板与 e2e 测试用）
            vscode.commands.registerCommand("qingkuai.getTypeScriptInfo", () => {
                const installation = resolveTypeScript()
                if (!installation) {
                    return undefined
                }
                const { entry, source, version, label } = installation
                return { entry, source, version, label }
            }),

            // 等待语言服务器工作区就绪，超时（毫秒）返回 false
            vscode.commands.registerCommand(this.waitForWorkspaceReady, async (timeout = 60000) => {
                return await Promise.race([
                    workspaceReadyPromise.then(() => true),
                    sleep(timeout).then(() => false)
                ])
            }),

            // 重启qingkuai语言服务器
            vscode.commands.registerCommand(this.restartLanguageServer, async () => {
                if (client.isRunning()) {
                    await client.stop()
                    runAll([restartTsServer, activeLanguageServer])
                }
            }),

            // 打开文件并选中指定范围
            vscode.commands.registerCommand(
                this.openFileByPath,
                async ({ path, start, end }: OpenFileParams) => {
                    if (!nodeFs.existsSync(path)) {
                        return vscode.window.showWarningMessage(
                            `Can not open document: ${path}, as it does not exist.`
                        )
                    }

                    const doc = await vscode.workspace.openTextDocument(path)
                    vscode.commands.executeCommand("vscode.open", doc.uri, {
                        selection: new vscode.Range(doc.positionAt(start), doc.positionAt(end))
                    })
                }
            ),

            // 显示引用位置
            vscode.commands.registerCommand(
                this.showReferences,
                (params: QingkuaiCommandTypes.ShowReferencesParams) => {
                    const locations: vscode.Location[] = params.locations.map(location => {
                        return new vscode.Location(
                            vscode.Uri.parse(location.uri),
                            new vscode.Range(
                                new vscode.Position(
                                    location.range.start.line,
                                    location.range.start.character
                                ),
                                new vscode.Position(
                                    location.range.end.line,
                                    location.range.end.character
                                )
                            )
                        )
                    })
                    const position = new vscode.Position(
                        params.position.line,
                        params.position.character
                    )
                    vscode.commands.executeCommand(
                        "editor.action.showReferences",
                        vscode.Uri.file(params.fileName),
                        position,
                        locations
                    )
                }
            )
        )
    }
}

function restartTsServer() {
    vscode.commands.executeCommand("typescript.restartTsServer")
}

type TypeScriptPickItem = vscode.QuickPickItem & {
    entry?: string
    action?: "browse" | "reset"
}

// 列出探测到的 typescript 安装，允许浏览指定任意入口文件，或清空设置回到自动探测；
// 设置写在用户级（typescript 路径通常与具体工程无关，而是与机器/安装位置相关）
// Lists the detected typescript installations, allows browsing for any entry file, or clears the
// setting back to auto detection. The setting is written at user scope: the path is tied to the
// machine/installation, not to a particular project.
async function selectTypeScriptPath() {
    const configured = vscode.workspace
        .getConfiguration("qingkuai")
        .get<string>("typescriptPath", "")
    const current = resolveTypeScript()
    const items: TypeScriptPickItem[] = listTypeScriptInstallations().map(installation => {
        return {
            label: `${installation.entry === current?.entry ? "$(check) " : ""}${installation.label}`,
            description: installation.version ? `TypeScript ${installation.version}` : undefined,
            detail: installation.entry,
            entry: installation.entry
        }
    })
    items.push({
        label: "$(folder-opened) Browse for lib/typescript.js...",
        action: "browse"
    })
    if (!configured) {
        items.push({
            label: "$(discard) Reset to automatic (bundled / workspace)",
            action: "reset"
        })
    }

    const picked = await vscode.window.showQuickPick(items, {
        title: "TypeScript used by the QingKuai compiler",
        placeHolder: configured
            ? `Current setting: ${configured}`
            : "Using the automatically detected typescript"
    })
    if (!picked) {
        return
    }

    if (picked.action === "reset") {
        return await applyTypeScriptPath("")
    }
    if (picked.action === "browse") {
        const selected = await vscode.window.showOpenDialog({
            title: "Select lib/typescript.js",
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            defaultUri: current ? vscode.Uri.file(current.entry) : undefined,
            filters: { TypeScript: ["js"] }
        })
        if (!selected?.length) {
            return
        }
        return await applyTypeScriptPath(selected[0].fsPath)
    }
    await applyTypeScriptPath(picked.entry!)
}

async function applyTypeScriptPath(entry: string) {
    await vscode.workspace
        .getConfiguration("qingkuai")
        .update("typescriptPath", entry, vscode.ConfigurationTarget.Global)

    const installation = resolveTypeScript()
    const description = installation
        ? `${installation.label} (${installation.version ?? "unknown version"})`
        : "no typescript installation"
    const restart = await vscode.window.showInformationMessage(
        `QingKuai compiler typescript: ${description}.`,
        "Restart Language Server"
    )
    if (restart) {
        vscode.commands.executeCommand("qingkuai.restartLanguageServer")
    }
}
