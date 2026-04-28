import type { ExtensionContext } from "vscode"
import type { McpServerPackageInfo, ModelServerLaunchInfo } from "./types"

import * as vscode from "vscode"

import nodeFs from "node:fs"
import nodePath from "node:path"

import { Logger } from "./state"

export function registerMcpServerDefinitionProvider(context: ExtensionContext) {
    const vscodeApi = vscode as any
    const logStartFailed = (reason: string) => {
        Logger.warn(`MCP server registration failed${reason ? `: ${reason}` : ""}.`)
    }

    if (typeof vscodeApi?.lm?.registerMcpServerDefinitionProvider !== "function") {
        return logStartFailed("lm.registerMcpServerDefinitionProvider is unavailable")
    }

    const providerId = "qingkuai-tools.qingkuai-mcp-server"
    const definitionCtor = vscodeApi.McpStdioServerDefinition
    if (typeof definitionCtor !== "function") {
        return logStartFailed("McpStdioServerDefinition constructor is unavailable")
    }

    const launch = resolveModelServerLaunch(context)
    if (!launch) {
        return logStartFailed("qingkuai-mcp-server dependency not found")
    }

    Logger.info(`MCP server resolved: command=${launch.command}, entry=${launch.args[0]}`)

    const provider = {
        provideMcpServerDefinitions() {
            Logger.info(`MCP server definition requested: ${launch.title} v${launch.version}`)
            const serverDefinition = new definitionCtor(
                launch.title,
                launch.command,
                launch.args,
                {},
                launch.version
            )
            serverDefinition.cwd = vscode.Uri.file(launch.cwd)
            return [serverDefinition]
        }
    }

    context.subscriptions.push(
        vscodeApi.lm.registerMcpServerDefinitionProvider(providerId, provider)
    )
    Logger.info("MCP server definition provider registered successfully.")
}

function resolveModelServerLaunch(context: ExtensionContext): ModelServerLaunchInfo | undefined {
    const packageJsonCandidates = [
        context.asAbsolutePath("./node_modules/qingkuai-mcp-server/package.json"),
        nodePath.resolve(context.extensionPath, "../mcp-server/package.json")
    ]
    const packageInfo = resolveMcpServerPackageInfo(packageJsonCandidates)

    const launchCandidates = packageInfo?.entryCandidates ?? [
        context.asAbsolutePath("./node_modules/qingkuai-mcp-server/dist/index.mjs"),
        context.asAbsolutePath("./node_modules/qingkuai-mcp-server/index.mjs"),
        nodePath.resolve(context.extensionPath, "../mcp-server/dist/index.mjs")
    ]

    for (const entry of launchCandidates) {
        if (!nodeFs.existsSync(entry)) {
            continue
        }
        return {
            command: process.execPath,
            args: [entry],
            cwd: nodePath.dirname(entry),
            title: packageInfo?.title ?? "QingKuai MCP Server",
            version: packageInfo?.version ?? "1.0.0"
        }
    }
}

function resolveMcpServerPackageInfo(packageJsonCandidates: string[]): McpServerPackageInfo | null {
    for (const packageJsonPath of packageJsonCandidates) {
        if (!nodeFs.existsSync(packageJsonPath)) {
            continue
        }

        try {
            const packageJson = JSON.parse(nodeFs.readFileSync(packageJsonPath, "utf-8"))
            const packageDir = nodePath.dirname(packageJsonPath)
            const mainEntry =
                typeof packageJson.main === "string" ? packageJson.main : "dist/index.mjs"
            const exportEntry = resolveExportEntry(packageJson)
            const entryCandidates = [
                nodePath.join(packageDir, normalizeRelativePath(mainEntry)),
                nodePath.join(packageDir, "dist/index.mjs"),
                nodePath.join(packageDir, "index.mjs")
            ]

            if (exportEntry) {
                entryCandidates.unshift(
                    nodePath.join(packageDir, normalizeRelativePath(exportEntry))
                )
            }

            return {
                entryCandidates: Array.from(new Set(entryCandidates)),
                title:
                    typeof packageJson.displayName === "string"
                        ? packageJson.displayName
                        : "QingKuai MCP Server",
                version: typeof packageJson.version === "string" ? packageJson.version : "1.0.0"
            }
        } catch {
            continue
        }
    }

    return null
}

function resolveExportEntry(packageJson: any): string | null {
    const exportsField = packageJson?.exports
    if (typeof exportsField === "string") {
        return exportsField
    }

    const rootExport = exportsField?.["."]
    if (typeof rootExport === "string") {
        return rootExport
    }
    if (typeof rootExport?.import === "string") {
        return rootExport.import
    }

    return null
}

function normalizeRelativePath(pathValue: string) {
    return pathValue.startsWith("./") ? pathValue.slice(2) : pathValue
}
