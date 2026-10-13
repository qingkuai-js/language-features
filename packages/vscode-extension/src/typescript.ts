import * as vscode from "vscode"

import nodeFs from "node:fs"
import nodePath from "node:path"

import { Logger } from "./state"
import { isEmptyString, isString } from "../../../shared-util/assert"

const TYPESCRIPT_ENTRY = "node_modules/typescript/lib/typescript.js"

export type TypeScriptSource = "setting" | "bundled" | "workspace"

export interface TypeScriptInstallation {
    entry: string
    source: TypeScriptSource
    version: string | undefined
    // 供选择列表与状态栏展示的名称，例如 "VS Code (bundled)"、"Workspace: app"
    // label shown in the picker and status bar, e.g. "VS Code (bundled)", "Workspace: app"
    label: string
}

// 扩展不再附带完整的 typescript 包，改为复用 VS Code 内置的 typescript（或工作区内的），
// 并把入口文件路径传给语言服务器和 MCP 服务器
// The extension no longer ships a full typescript package: it reuses the typescript bundled with
// VS Code (or the one from the workspace) and forwards the entry file path to the language server
// and the MCP server.
export function resolveTypeScriptEntry(): string | undefined {
    return resolveTypeScript()?.entry
}

// 解析编译器实际使用的 typescript：显式设置优先，其次是 VS Code 内置的那份，最后是工作区里的
// Resolve the typescript the compiler actually uses: an explicit setting wins, then the copy bundled
// with VS Code, then the one inside the workspace.
export function resolveTypeScript(): TypeScriptInstallation | undefined {
    const candidates = listTypeScriptInstallations()
    const resolved = candidates.find(candidate => candidate.source === "setting") ?? candidates[0]
    if (!resolved) {
        Logger.warn(
            "No typescript installation found for the qingkuai compiler, tried:\n" +
                candidatePaths().join("\n")
        )
    }
    return resolved
}

// 所有可用的候选（跳过不存在的路径），设置里的那条排在最前
// All usable candidates (paths that exist), the configured one first
export function listTypeScriptInstallations(): TypeScriptInstallation[] {
    return candidatePaths()
        .map(({ entry, source, label }) => {
            return { entry, source, label, version: readVersion(entry) }
        })
        .filter(installation => nodeFs.existsSync(installation.entry))
}

function candidatePaths(): Pick<TypeScriptInstallation, "entry" | "source" | "label">[] {
    const bundledTsExtension = vscode.extensions.getExtension("vscode.typescript-language-features")
    const candidates: Pick<TypeScriptInstallation, "entry" | "source" | "label">[] = []
    const configured = resolveConfiguredEntry()
    if (configured) {
        candidates.push({ entry: configured, source: "setting", label: "qingkuai.typescriptPath" })
    }
    if (bundledTsExtension?.extensionPath) {
        candidates.push({
            entry: nodePath.join(bundledTsExtension.extensionPath, TYPESCRIPT_ENTRY),
            source: "bundled",
            label: "VS Code (bundled)"
        })
    }
    candidates.push({
        entry: nodePath.join(vscode.env.appRoot, "extensions", TYPESCRIPT_ENTRY),
        source: "bundled",
        label: "VS Code (bundled)"
    })
    for (const [entry, folderName] of workspaceTypeScriptEntries()) {
        candidates.push({ entry, source: "workspace", label: `Workspace: ${folderName}` })
    }
    return candidates
}

// 版本号取自 typescript 包自己的 package.json（lib/typescript.js 的上级目录），无需加载整个编译器
// The version comes from the typescript package's own package.json (the parent of lib/typescript.js),
// so the compiler itself does not have to be loaded
function readVersion(entry: string): string | undefined {
    try {
        const manifest = nodePath.join(nodePath.dirname(entry), "..", "package.json")
        const version = JSON.parse(nodeFs.readFileSync(manifest, "utf-8")).version
        return isString(version) ? version : undefined
    } catch {
        return undefined
    }
}

// 供极端环境（内置 typescript 及其它备选都不存在）手动指定入口，设置里的路径优先
// Escape hatch for environments where neither the bundled nor the workspace typescript can be
// found: the configured path wins over the detected ones.
function resolveConfiguredEntry(): string | undefined {
    const configured = vscode.workspace
        .getConfiguration("qingkuai")
        .get<string>("typescriptPath", "")
    if (isEmptyString(configured) || !isString(configured)) {
        return undefined
    }
    if (!nodeFs.existsSync(configured)) {
        Logger.warn(`qingkuai.typescriptPath points to a missing file: ${configured}`)
        return undefined
    }
    return configured
}

function workspaceTypeScriptEntries(): [string, string][] {
    return (vscode.workspace.workspaceFolders ?? [])
        .filter(folder => folder.uri.scheme === "file")
        .map(folder => [nodePath.join(folder.uri.fsPath, TYPESCRIPT_ENTRY), folder.name])
}
