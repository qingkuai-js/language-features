import type {
    RenameFileParams,
    RetransmissionParams,
    RefreshDiagnosticParams
} from "../../../types/communication"
import type { RealPath } from "../../../types/common"

import * as vscode from "vscode"
import { basename } from "node:path"
import { getConfigTarget } from "./config"
import { client, limitedScriptLanguageFeatures } from "./state"
import { isQingkuaiFileName } from "../../../shared-util/assert"
import { LSHandler, TPICHandler } from "../../../shared-util/constant"

export async function attachFileSystemHandlers() {
    if (!limitedScriptLanguageFeatures) {
        vscode.workspace.onDidRenameFiles(async ({ files }) => {
            for (const { oldUri, newUri } of files) {
                const oldPath = oldUri.fsPath as RealPath
                const newPath = newUri.fsPath as RealPath
                if (!isQingkuaiFileName(oldPath) && !isQingkuaiFileName(newPath)) {
                    client.sendNotification(LSHandler.Retransmission, {
                        name: TPICHandler.RefreshDiagnostic,
                        data: {
                            byFileName: "///fs",
                            scriptKindChanged: false
                        } satisfies RefreshDiagnosticParams
                    } satisfies RetransmissionParams)
                    return
                }

                if (await shouldUpdateImports(newUri)) {
                    client.sendNotification(LSHandler.RenameFile, {
                        oldPath,
                        newPath
                    } satisfies RenameFileParams)
                }
            }
        })
    }
}

async function shouldUpdateImports(uri: vscode.Uri) {
    enum ConfigValue {
        never = "never",
        always = "always"
    }
    const updateImportsConfigName = "updateImportsOnFileMove.enabled"
    const languageConfig = vscode.workspace.getConfiguration(
        await client.sendRequest(LSHandler.Retransmission, {
            data: uri.fsPath,
            name: TPICHandler.GetLanguageId
        } satisfies RetransmissionParams),
        uri
    )
    const updateImportsConfig: string = languageConfig.get(updateImportsConfigName, "prompt")
    if (updateImportsConfig === ConfigValue.always) {
        return true
    } else if (updateImportsConfig === ConfigValue.never) {
        return false
    }

    const rejectItem: vscode.MessageItem = {
        title: vscode.l10n.t("No"),
        isCloseAffordance: true
    }
    const acceptItem: vscode.MessageItem = {
        title: vscode.l10n.t("Yes")
    }
    const alwaysItem: vscode.MessageItem = {
        title: vscode.l10n.t("Always")
    }
    const neverItem: vscode.MessageItem = {
        title: vscode.l10n.t("Never")
    }
    const message = `Update imports for ${basename(uri.fsPath)}`
    const buttons = [rejectItem, acceptItem, alwaysItem, neverItem]
    const choice = await vscode.window.showInformationMessage(message, { modal: true }, ...buttons)

    const updateConfig = (value: ConfigValue) => {
        languageConfig.update(
            updateImportsConfigName,
            value,
            getConfigTarget(languageConfig, updateImportsConfigName)
        )
    }

    if (choice === alwaysItem) {
        return updateConfig(ConfigValue.always), true
    }
    if (choice === neverItem) {
        return updateConfig(ConfigValue.never), false
    }
    return choice === acceptItem
}
