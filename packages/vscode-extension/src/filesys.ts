import type { LanguageClient } from "vscode-languageclient/node"
import type { RenameFileParams } from "../../../types/communication"

import * as vscode from "vscode"
import { basename } from "node:path"
import { getConfigTarget } from "./config"
import { LSHandler } from "../../../shared-util/constant"

export async function attachFileSystemHandlers(client: LanguageClient) {
    vscode.workspace.onDidRenameFiles(async ({ files }) => {
        for (const { oldUri, newUri } of files) {
            if (await shouldUpdateImports(newUri)) {
                client.sendNotification(LSHandler.renameFile, {
                    oldPath: oldUri.fsPath,
                    newPath: newUri.fsPath
                } satisfies RenameFileParams)
            }
        }
    })
}

async function shouldUpdateImports(uri: vscode.Uri) {
    enum ConfigValue {
        never = "never",
        always = "always"
    }
    const updateImportsConfigName = "updateImportsOnFileMove.enabled"
    const tsConfig = vscode.workspace.getConfiguration("typescript", uri)
    const updateImportsConfig: string = tsConfig.get(updateImportsConfigName, "prompt")
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
        tsConfig.update(
            updateImportsConfigName,
            value,
            getConfigTarget(tsConfig, updateImportsConfigName)
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
