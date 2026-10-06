import type {
    RenameFileParams,
    RenameFileResult,
    RetransmissionParams
} from "../../../types/communication"
import type { RenameFilePair } from "./types"

import * as vscode from "vscode"

import nodePath from "node:path"

import { getVscodeConfigTarget } from "./config"
import { inspect } from "../../../shared-util/log"
import { debounce } from "../../../shared-util/sundry"
import { isQingkuaiFileName } from "../../../shared-util/assert"
import { LS_HANDLERS, TP_HANDLERS } from "../../../shared-util/constant"
import { Logger, client, limitedScriptLanguageFeatures, disposables } from "./state"

export function attachFileSystemHandlers() {
    if (!limitedScriptLanguageFeatures) {
        disposables.push(
            vscode.workspace.onWillRenameFiles(evt => {
                evt.waitUntil(updateImportsOnRename(evt.files))
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

async function updateImportsOnRename(files: readonly RenameFilePair[]) {
    const workspaceEdit = new vscode.WorkspaceEdit()
    for (const { oldUri, newUri } of files) {
        const [oldPath, newPath] = [oldUri.fsPath, newUri.fsPath]
        if (!isQingkuaiFileName(oldPath) || !isQingkuaiFileName(newPath)) {
            continue
        }
        if (!(await shouldUpdateImports(newUri, oldUri))) {
            continue
        }

        try {
            const ret = await client.sendRequest<RenameFileResult>(LS_HANDLERS.RenameFile, {
                oldPath,
                newPath
            } satisfies RenameFileParams)
            ret.forEach(editItem => {
                editItem.changes.forEach(change => {
                    workspaceEdit.replace(
                        vscode.Uri.file(editItem.fileName),
                        new vscode.Range(
                            new vscode.Position(
                                change.range.start.line,
                                change.range.start.character
                            ),
                            new vscode.Position(change.range.end.line, change.range.end.character)
                        ),
                        change.newText
                    )
                })
            })
        } catch (error) {
            Logger.warn(
                `Update imports on renaming ${nodePath.basename(oldPath)} failed.\n${inspect(error)}`
            )
        }
    }
    return workspaceEdit
}

async function shouldUpdateImports(newUri: vscode.Uri, oldUri: vscode.Uri) {
    enum ConfigValue {
        never = "never",
        always = "always"
    }
    const updateImportsConfigName = "updateImportsOnFileMove.enabled"
    const languageConfig = vscode.workspace.getConfiguration(
        await client.sendRequest(LS_HANDLERS.Retransmission, {
            // will 阶段旧路径必然存在，语言 id 由内容决定且不随改名变化
            data: oldUri.fsPath,
            name: TP_HANDLERS.GetLanguageId
        } satisfies RetransmissionParams),
        newUri
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
    const message = `Update imports for ${nodePath.basename(newUri.fsPath)}`
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
