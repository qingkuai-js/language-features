import type {
    EntryInspection,
    TypeScriptModule,
    TypeScriptInstallation,
    TypeScriptLoadFailure,
    WorkspaceTypeScriptEntry
} from "./types"

import * as vscode from "vscode"

import nodeFs from "node:fs"
import nodePath from "node:path"
import nodeModule from "node:module"

import { Logger } from "./state"
import { joinWithNewLine } from "../../../shared-util/sundry"
import { TypeScriptSource } from "../../../shared-util/constant"
import { isEmptyString, isString } from "../../../shared-util/assert"

enum TypeScriptInstallationField {
    Entry = "entry",
    Source = "source",
    Label = "label"
}

let loadFailure: TypeScriptLoadFailure | undefined
const entryInspections = new Map<string, EntryInspection>()
const TYPESCRIPT_ENTRY = "node_modules/typescript/lib/typescript.js"

/** 解析编译器实际使用的 typescript 的入口文件 */
export function resolveTypeScriptEntry(): string | undefined {
    return resolveTypeScript()?.entry
}

/** 解析编译器实际使用的 typescript 的安装信息（入口、来源、版本等） */
export function resolveTypeScript(): TypeScriptInstallation | undefined {
    const candidates = listTypeScriptInstallations()
    const resolved = candidates.find(c => c.source === TypeScriptSource.Setting) ?? candidates[0]
    if (!resolved) {
        const triedPaths = joinWithNewLine(candidatePaths().map(c => c.entry))
        Logger.warn(
            `No typescript installation found for the qingkuai compiler, tried:\n${triedPaths}`
        )
    }
    return resolved
}

/** 获取上次解析失败的 typescript 安装信息（入口、失败原因等），没有失败则返回 undefined */
export function getTypeScriptLoadFailure(): TypeScriptLoadFailure | undefined {
    return loadFailure
}

/** 列举所有探测到的 typescript 安装 */
export function listTypeScriptInstallations(): TypeScriptInstallation[] {
    loadFailure = undefined

    const installations: TypeScriptInstallation[] = []
    for (const { entry, source, label } of candidatePaths()) {
        if (source === TypeScriptSource.Setting) {
            const inspection = inspectEntry(entry)
            if (!inspection.loaded) {
                loadFailure = {
                    entry,
                    message: inspection.message
                }
                Logger.error(
                    `Failed to load the typescript set by qingkuai.typescriptPath: ${inspection.message}`
                )
                continue
            }

            // 入口可能是目录，此时模块自报的版本比按文件位置推算的更可靠
            installations.push({
                entry,
                source,
                label,
                version: inspection.version ?? readVersion(entry)
            })
            continue
        }
        if (nodeFs.existsSync(entry)) {
            installations.push({ entry, source, label, version: readVersion(entry) })
        }
    }
    return installations
}

/** 解析所有候选的入口文件路径，设置里的那条排在最前 */
function candidatePaths(): Pick<TypeScriptInstallation, TypeScriptInstallationField>[] {
    const configured = resolveConfiguredEntry()
    const candidates: Pick<TypeScriptInstallation, TypeScriptInstallationField>[] = []
    const bundledTsExtension = vscode.extensions.getExtension("vscode.typescript-language-features")
    if (configured) {
        candidates.push({
            entry: configured,
            source: TypeScriptSource.Setting,
            label: "qingkuai.typescriptPath"
        })
    }
    if (bundledTsExtension?.extensionPath) {
        candidates.push({
            entry: nodePath.join(bundledTsExtension.extensionPath, TYPESCRIPT_ENTRY),
            source: TypeScriptSource.Bundled,
            label: "VS Code (bundled)"
        })
    }
    candidates.push({
        entry: nodePath.join(vscode.env.appRoot, "extensions", TYPESCRIPT_ENTRY),
        source: TypeScriptSource.Bundled,
        label: "VS Code (bundled)"
    })
    for (const [entry, folderName] of workspaceTypeScriptEntries()) {
        candidates.push({
            entry,
            source: TypeScriptSource.Workspace,
            label: `Workspace: ${folderName}`
        })
    }
    return candidates
}

/** 解析 typescript 的版本号 */
function readVersion(entry: string): string | undefined {
    try {
        const manifest = nodePath.join(nodePath.dirname(entry), "..", "package.json")
        const version = JSON.parse(nodeFs.readFileSync(manifest, "utf-8")).version
        return isString(version) ? version : undefined
    } catch {
        return undefined
    }
}

/** 解析设置里指定的 typescript 入口文件路径，空字符串或非字符串返回 undefined */
function resolveConfiguredEntry(): string | undefined {
    const configured = vscode.workspace
        .getConfiguration("qingkuai")
        .get<string>("typescriptPath", "")
    if (isEmptyString(configured) || !isString(configured)) {
        return undefined
    }
    return configured
}

/** 检查一个 typescript 入口是否可用 */
function inspectEntry(entry: string): EntryInspection {
    const inspected = entryInspections.get(entry)
    if (inspected) {
        return inspected
    }

    let inspection: EntryInspection
    const requireFromExtension = nodeModule.createRequire(__filename)
    try {
        const resolved = requireFromExtension.resolve(entry)
        const preloaded = resolved in requireFromExtension.cache
        const api = requireFromExtension(resolved) as TypeScriptModule
        if (typeof api?.createSourceFile !== "function") {
            inspection = {
                loaded: false,
                message: `the module at "${entry}" is not a typescript implementation`
            }
        } else {
            // 释放 require 缓存，避免占用内存或污染全局状态
            if (!preloaded) {
                delete requireFromExtension.cache[resolved]
            }
            inspection = {
                loaded: true,
                version: isString(api.version) ? api.version : undefined
            }
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        inspection = {
            loaded: false,
            message: message.split("\n")[0].trim()
        }
    }
    return (entryInspections.set(entry, inspection), inspection)
}

function workspaceTypeScriptEntries(): WorkspaceTypeScriptEntry[] {
    return (vscode.workspace.workspaceFolders ?? [])
        .filter(folder => folder.uri.scheme === "file")
        .map((folder): WorkspaceTypeScriptEntry => [
            nodePath.join(folder.uri.fsPath, TYPESCRIPT_ENTRY),
            folder.name
        ])
}
