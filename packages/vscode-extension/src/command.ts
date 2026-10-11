import type { GeneralFunc } from "../../../types/util"
import type { OpenFileParams } from "../../../types/common"
import type { QingkuaiCommandTypes } from "../../../types/command"

import * as vscode from "vscode"

import nodeFs from "node:fs"

import { runAll, sleep } from "../../../shared-util/sundry"
import { client, disposables, workspaceReadyPromise } from "./state"

export class QingkuaiCommands {
    public showReferences = "qingkuai.showReferences"
    public openFileByPath = "qingkuai.openFileByFilePath"
    public viewServerLogs = "qingkuai.viewLanguageServerLogs"
    public waitForWorkspaceReady = "qingkuai.waitForWorkspaceReady"
    public restartLanguageServer = "qingkuai.restartLanguageServer"

    constructor(outputChannel: vscode.OutputChannel, activeLanguageServer: GeneralFunc) {
        disposables.push(
            // 查看 qingkuai 语言服务器日志
            vscode.commands.registerCommand(this.viewServerLogs, () => {
                outputChannel.show()
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
