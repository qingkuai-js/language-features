import type {
    RenameFileParams,
    RetransmissionParams,
    RefreshDiagnosticParams
} from "../../../types/communication"
import type { LanguageClient } from "vscode-languageclient/node"

import * as vscode from "vscode"
import { basename } from "node:path"
import { getConfigTarget } from "./config"
import { isQingkuaiFileName } from "../../../shared-util/assert"
import { LSHandler, TPICHandler } from "../../../shared-util/constant"

export async function attachFileSystemHandlers(client: LanguageClient) {
    vscode.workspace.onDidRenameFiles(async ({ files }) => {
        for (const { oldUri, newUri } of files) {
            const [oldPath, newPath] = [oldUri.fsPath, newUri.fsPath]
            if (!isQingkuaiFileName(oldPath) && !isQingkuaiFileName(newPath)) {
                client.sendNotification(LSHandler.retransmission, {
                    name: TPICHandler.refreshDiagnostic,
                    data: {
                        byFileName: "///fs",
                        scriptKindChanged: false
                    } satisfies RefreshDiagnosticParams
                } satisfies RetransmissionParams)
                return
            }

            if (await shouldUpdateImports(client, newUri)) {
                client.sendNotification(LSHandler.renameFile, {
                    oldPath,
                    newPath
                } satisfies RenameFileParams)
            }
        }
    })
}

async function shouldUpdateImports(client: LanguageClient, uri: vscode.Uri) {
    enum ConfigValue {
        never = "never",
        always = "always"
    }
    const updateImportsConfigName = "updateImportsOnFileMove.enabled"
    const languageConfig = vscode.workspace.getConfiguration(
        await client.sendRequest(LSHandler.retransmission, {
            data: uri.fsPath,
            name: TPICHandler.getLanguageId
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
