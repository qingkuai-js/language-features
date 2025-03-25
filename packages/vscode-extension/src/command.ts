import type { GeneralFunc } from "../../../types/util"
import type { OpenFileParams } from "../../../types/common"

import fs from "node:fs"
import * as vscode from "vscode"
import { client } from "./state"
import { ShowReferencesCommandParams } from "../../../types/command"
import { runAll } from "../../../shared-util/sundry"

export class QingkuaiCommands {
    public showReferences = "qingkuai.showReferences"
    public openFileByPath = "qingkuai.openFileByFilePath"
    public viewServerLogs = "qingkuai.viewLanguageServerLogs"
    public restartLanguageServer = "qingkuai.restartLanguageServer"

    constructor(outputChannel: vscode.OutputChannel, activeLanguageServer: GeneralFunc) {
        vscode.commands.registerCommand(this.viewServerLogs, () => {
            outputChannel.show()
        })

        vscode.commands.registerCommand(this.restartLanguageServer, async () => {
            if (client.isRunning()) {
                await client.stop()
                runAll([restartTsServer, activeLanguageServer])
            }
        })

        vscode.commands.registerCommand(
            this.openFileByPath,
            async ({ path, start, end }: OpenFileParams) => {
                if (!fs.existsSync(path)) {
                    return vscode.window.showWarningMessage(
                        `Can not open document: ${path}, as it does not exist.`
                    )
                }

                const doc = await vscode.workspace.openTextDocument(path)
                vscode.commands.executeCommand("vscode.open", doc.uri, {
                    selection: new vscode.Range(doc.positionAt(start), doc.positionAt(end))
                })
            }
        )

        vscode.commands.registerCommand(
            this.showReferences,
            (params: ShowReferencesCommandParams) => {
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
    }
}

function restartTsServer() {
    vscode.commands.executeCommand("typescript.restartTsServer")
}
