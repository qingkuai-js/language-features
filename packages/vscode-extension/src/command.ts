import type { OpenFileParams } from "../../../types/common"

import fs from "node:fs"
import * as vsc from "vscode"

export class QingkuaiCommands {
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
    }
}
