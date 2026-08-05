import type { RenameFileParams, RetransmissionParams } from "../../../types/communication"

import * as vscode from "vscode"
import nodePath from "node:path"

import { getVscodeConfigTarget } from "./config"
import { debounce } from "../../../shared-util/sundry"
import { isQingkuaiFileName } from "../../../shared-util/assert"
import { LS_HANDLERS, TP_HANDLERS } from "../../../shared-util/constant"
import { client, limitedScriptLanguageFeatures, disposables } from "./state"

export function attachFileSystemHandlers() {
    if (limitedScriptLanguageFeatures) {
        disposables.push(
            vscode.workspace.onDidRenameFiles(async ({ files }) => {
                for (const { oldUri, newUri } of files) {
                    const [oldPath, newPath] = [oldUri.fsPath, newUri.fsPath]
                    if (isQingkuaiFileName(oldPath) && isQingkuaiFileName(newPath)) {
                        if (await shouldUpdateImports(newUri)) {
                            client.sendNotification(LS_HANDLERS.RenameFile, {
                                oldPath,
                                newPath
                            } satisfies RenameFileParams)
                        }
                    }
                }
            })
        )
    }

    const watcher = vscode.workspace.createFileSystemWatcher("**/*")

    const debouncedRefresh = debounce((uri: vscode.Uri) => {
        if (!isQingkuaiFileName(uri.fsPath)) {
            client.sendNotification(LS_HANDLERS.RefreshDiagnostic, true)
        }
    }, 300)

    const debouncedCleanCache = debounce(() => {
        client.sendNotification(LS_HANDLERS.CleanLanguageConfigCache)
    }, 300)

    const fileWatcherHandler = (uri: vscode.Uri) => {
        const base = nodePath.basename(uri.fsPath)
        switch (base) {
            case ".qingkuairc":
            case "tsconfig.json":
            case "jsconfig.json":
            case ".prettierrc":
            case ".prettierrc.json":
            case ".prettierrc.js":
            case ".prettierrc.cjs":
            case ".prettierrc.yaml":
            case ".prettierrc.yml":
            case ".prettierrc.toml":
            case "prettier.config.js":
            case "prettier.config.cjs": {
                return debouncedCleanCache()
            }
        }
        debouncedRefresh(uri)
    }
    watcher.onDidChange(fileWatcherHandler)
    watcher.onDidCreate(fileWatcherHandler)
    watcher.onDidDelete(fileWatcherHandler)
    disposables.push(watcher)
}

async function shouldUpdateImports(uri: vscode.Uri) {
    enum ConfigValue {
        never = "never",
        always = "always"
    }
    const updateImportsConfigName = "updateImportsOnFileMove.enabled"
    const languageConfig = vscode.workspace.getConfiguration(
        await client.sendRequest(LS_HANDLERS.Retransmission, {
            data: uri.fsPath,
            name: TP_HANDLERS.GetLanguageId
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
    const message = `Update imports for ${nodePath.basename(uri.fsPath)}`
    const buttons = [rejectItem, acceptItem, alwaysItem, neverItem]
    const choice = await vscode.window.showInformationMessage(message, { modal: true }, ...buttons)

    const updateClientSetting = (value: ConfigValue) => {
        languageConfig.update(
            updateImportsConfigName,
            value,
            getVscodeConfigTarget(languageConfig, updateImportsConfigName)
        )
    }

    if (choice === alwaysItem) {
        return (updateClientSetting(ConfigValue.always), true)
    }
    if (choice === neverItem) {
        return (updateClientSetting(ConfigValue.never), false)
    }
    return choice === acceptItem
}
