import type { OpenFileParams } from "../../../types/common"

import fs from "node:fs"
import * as vsc from "vscode"
import { ShowReferencesCommandParams } from "../../../types/command"

export class QingkuaiCommands {
    public showReferences = "qingkuai.showReferences"
    public openFileByPath = "qingkuai.openFileByFilePath"
    public viewServerLogs = "qingkuai.viewLanguageServerLogs"

    constructor(outputChannel: vsc.OutputChannel) {
        vsc.commands.registerCommand(this.viewServerLogs, () => {
            outputChannel.show()
        })

        vsc.commands.registerCommand(
            this.openFileByPath,
            async ({ path, start, end }: OpenFileParams) => {
                if (!fs.existsSync(path)) {
                    return vsc.window.showWarningMessage(
                        `Can not open document: ${path}, as it does not exist.`
                    )
                }

                const doc = await vsc.workspace.openTextDocument(path)
                vsc.commands.executeCommand("vscode.open", doc.uri, {
                    selection: new vsc.Range(doc.positionAt(start), doc.positionAt(end))
                })
            }
        )

        vsc.commands.registerCommand(this.showReferences, (params: ShowReferencesCommandParams) => {
            const locations: vsc.Location[] = params.locations.map(location => {
                return new vsc.Location(
                    vsc.Uri.parse(location.uri),
                    new vsc.Range(
                        new vsc.Position(location.range.start.line, location.range.start.character),
                        new vsc.Position(location.range.end.line, location.range.end.character)
                    )
                )
            })
            const position = new vsc.Position(params.position.line, params.position.character)
            vsc.commands.executeCommand(
                "editor.action.showReferences",
                vsc.Uri.file(params.fileName),
                position,
                locations
            )
        })
    }
}
