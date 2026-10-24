import type { TypeScriptPickItem } from "./types"
import type { GeneralFunc } from "../../../types/util"
import type { OpenFileParams } from "../../../types/common"
import type { QingkuaiCommandTypes } from "../../../types/command"

import * as vscode from "vscode"

import nodeFs from "node:fs"

import {
    resolveTypeScript,
    getTypeScriptLoadFailure,
    listTypeScriptInstallations
} from "./typescript"
import { sleep } from "../../../shared-util/sundry"
import { client, disposables, workspaceReadyPromise } from "./state"
import { BUILTIN_COMMANDS, QK_COMMANDS } from "../../../shared-util/constant"

export function registerQingkuaiCommands(
    outputChannel: vscode.OutputChannel,
    activeLanguageServer: GeneralFunc
) {
    disposables.push(
        // 查看 qingkuai 语言服务器日志
        vscode.commands.registerCommand(QK_COMMANDS.ViewServerLogs, () => {
            outputChannel.show()
        }),

        // 选择 qingkuai 编译器使用的 typescript：可直接选探测到的安装，也可浏览指定
        vscode.commands.registerCommand(QK_COMMANDS.SelectTypeScriptPath, async () => {
            await selectTypeScriptPath()
        }),

        // 获取 qingkuai 编译器使用的 typescript 信息（入口、来源、版本、加载失败原因等）
        vscode.commands.registerCommand(QK_COMMANDS.GetTypeScriptInfo, () => {
            const installation = resolveTypeScript()
            const failure = getTypeScriptLoadFailure()
            if (!installation) {
                return undefined
            }
            return { ...installation, failure }
        }),

        // 等待语言服务器工作区就绪，超时（毫秒）返回 false
        vscode.commands.registerCommand(
            QK_COMMANDS.WaitForWorkspaceReady,
            async (timeout = 60000) => {
                return await Promise.race([
                    sleep(timeout).then(() => false),
                    workspaceReadyPromise.then(() => true)
                ])
            }
        ),

        // 重启qingkuai语言服务器
        vscode.commands.registerCommand(QK_COMMANDS.RestartLanguageServer, async () => {
            if (client?.isRunning()) {
                await client.stop()
                vscode.commands.executeCommand(BUILTIN_COMMANDS.RestartTsServer)
                activeLanguageServer()
            }
        }),

        // 打开文件并选中指定范围
        vscode.commands.registerCommand(
            QK_COMMANDS.OpenFileByPath,
            async ({ path, start, end }: OpenFileParams) => {
                if (!nodeFs.existsSync(path)) {
                    return vscode.window.showWarningMessage(
                        `Can not open document: ${path}, as it does not exist.`
                    )
                }

                const doc = await vscode.workspace.openTextDocument(path)
                vscode.commands.executeCommand(BUILTIN_COMMANDS.Open, doc.uri, {
                    selection: new vscode.Range(doc.positionAt(start), doc.positionAt(end))
                })
            }
        ),

        // 显示引用位置
        vscode.commands.registerCommand(
            QK_COMMANDS.ShowReferences,
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
                    BUILTIN_COMMANDS.EditorShowReferences,
                    vscode.Uri.file(params.fileName),
                    position,
                    locations
                )
            }
        )
    )
}

/** 列出探测到的 typescript 安装，允许浏览指定任意入口文件，或清空设置回到自动探测； */
async function selectTypeScriptPath() {
    const configured = vscode.workspace
        .getConfiguration("qingkuai")
        .get<string>("typescriptPath", "")
    const current = resolveTypeScript()
    const failure = getTypeScriptLoadFailure()
    const items: TypeScriptPickItem[] = listTypeScriptInstallations().map(installation => {
        return {
            entry: installation.entry,
            detail: installation.entry,
            description: installation.version ? `TypeScript ${installation.version}` : undefined,
            label: `${installation.entry === current?.entry ? "$(check) " : ""}${installation.label}`
        }
    })
    items.push({
        label: "$(folder-opened) Select lib/typescript.js...",
        action: "browse"
    })
    if (configured) {
        items.push({
            label: "$(discard) Reset to automatic (bundled / workspace)",
            action: "reset"
        })
    }

    const picked = await vscode.window.showQuickPick(items, {
        title: "TypeScript used by the QingKuai compiler",
        placeHolder: failure
            ? `Cannot load ${failure.entry}: ${failure.message}`
            : configured
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
            canSelectMany: false,
            canSelectFolders: false,
            filters: {
                TypeScript: ["js"]
            },
            defaultUri: current ? vscode.Uri.file(current.entry) : undefined
        })
        if (!selected?.length) {
            return
        }
        return await applyTypeScriptPath(selected[0].fsPath)
    }
    await applyTypeScriptPath(picked.entry!)
}

/** 应用 TypeScript 路径 */
async function applyTypeScriptPath(entry: string) {
    await vscode.workspace
        .getConfiguration("qingkuai")
        .update("typescriptPath", entry, vscode.ConfigurationTarget.Global)

    const installation = resolveTypeScript()
    const failure = getTypeScriptLoadFailure()
    if (failure) {
        const fallback = installation
            ? ` Falling back to ${installation.label} (${installation.version ?? "unknown version"}).`
            : ""
        await vscode.window.showWarningMessage(
            `The typescript at ${failure.entry} cannot be loaded: ${failure.message}.${fallback}`
        )
        return
    }

    const description = installation
        ? `${installation.label} (${installation.version ?? "unknown version"})`
        : "no typescript installation"
    await vscode.window.showInformationMessage(`QingKuai compiler typescript: ${description}.`)
}
