import type { MinimalManifest, VsceMode } from "../types/script"

import nodeFs from "node:fs"
import nodePath from "node:path"
import nodeUrl from "node:url"
import nodeChildProcess from "node:child_process"

const VSCE = "vsce@2.15.0"
const MIRROR = "https://registry.npmmirror.com"
const ROOT = nodePath.resolve(import.meta.dirname, "..")
const EXT_ROOT = nodePath.join(ROOT, "packages/vscode-extension")
const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies"] as const

const INSTALL_DIRS = [
    "vscode-extension",
    "typescript-plugin",
    "language-service",
    "language-server",
    "mcp-server"
]

const CATALOG_MANIFESTS = [
    nodePath.join(ROOT, "package.json"),
    nodePath.join(EXT_ROOT, "package.json"),
    nodePath.join(ROOT, "packages/language-server/package.json"),
    nodePath.join(ROOT, "packages/language-service/package.json"),
    nodePath.join(ROOT, "packages/mcp-server/package.json"),
    nodePath.join(ROOT, "packages/typescript-plugin/package.json")
]

const WORKSPACE_TO_FILE = new Map<string, Record<string, string>>([
    [
        nodePath.join(EXT_ROOT, "package.json"),
        {
            "qingkuai-mcp-server": "file:../mcp-server",
            "typescript-plugin-qingkuai": "file:../typescript-plugin",
            "qingkuai-language-service": "file:../language-service"
        }
    ],
    [
        nodePath.join(ROOT, "packages/language-server/package.json"),
        { "qingkuai-language-service": "file:../language-service" }
    ],
    [
        nodePath.join(ROOT, "packages/typescript-plugin/package.json"),
        { "qingkuai-language-service": "file:../language-service" }
    ]
])

function run(command: string, args: string[], cwd: string): void {
    const result = nodeChildProcess.spawnSync(command, args, {
        cwd,
        env: { ...process.env, npm_config_registry: MIRROR },
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"]
    })
    if (result.stdout) {
        process.stdout.write(result.stdout)
    }
    if (result.status !== 0) {
        if (result.stderr) {
            process.stderr.write(result.stderr)
        }
        throw new Error(`${command} ${args.join(" ")} failed with ${result.status}`)
    }
}

function readCatalog(): Map<string, string> {
    const raw = nodeFs.readFileSync(nodePath.join(ROOT, "pnpm-workspace.yaml"), "utf-8")
    const catalog = new Map<string, string>()
    let inCatalog = false
    for (const line of raw.split("\n")) {
        if (line.trim() === "catalog:") {
            inCatalog = true
            continue
        }
        if (inCatalog && /^\S/.test(line)) {
            break
        }
        if (!inCatalog) {
            continue
        }
        const matched = /^\s+(.+?):\s+(.+)$/.exec(line)
        if (matched) {
            catalog.set(unquote(matched[1]), unquote(matched[2]))
        }
    }
    return catalog
}

function unquote(text: string): string {
    return text.replace(/^["']|["']$/g, "")
}

export function rewriteManifests(): () => void {
    const catalog = readCatalog()
    const backups = new Map<string, string>()

    for (const manifestPath of CATALOG_MANIFESTS) {
        if (!nodeFs.existsSync(manifestPath)) {
            continue
        }
        const raw = nodeFs.readFileSync(manifestPath, "utf-8")
        const manifest = JSON.parse(raw) as MinimalManifest
        let changed = false

        for (const field of DEP_FIELDS) {
            for (const [name, version] of Object.entries(manifest[field] ?? {})) {
                const catalogVersion = catalog.get(name)
                if (version === "catalog:" && catalogVersion !== undefined) {
                    manifest[field]![name] = catalogVersion
                    changed = true
                }
            }
        }

        for (const [name, fileRef] of Object.entries(WORKSPACE_TO_FILE.get(manifestPath) ?? {})) {
            for (const field of DEP_FIELDS) {
                if (manifest[field]?.[name] === "workspace:*") {
                    manifest[field]![name] = fileRef
                    changed = true
                }
            }
        }

        if (changed) {
            backups.set(manifestPath, raw)
            nodeFs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 4)}\n`)
        }
    }

    return function restoreManifests() {
        for (const [manifestPath, raw] of backups) {
            nodeFs.writeFileSync(manifestPath, raw)
        }
    }
}

export function installDependencies(): void {
    for (const dir of INSTALL_DIRS) {
        const modules = nodePath.join(ROOT, "packages", dir, "node_modules")
        nodeFs.rmSync(modules, { recursive: true, force: true })
    }
    for (const dir of INSTALL_DIRS) {
        const packageDir = nodePath.join(ROOT, "packages", dir)
        process.stdout.write(`\n📦 npm install ${dir}...\n`)
        run("npm", ["install", "--no-audit", "--no-fund"], packageDir)
    }
}

export function buildProject(): void {
    process.stdout.write("\n🧩 生成 grammar...\n")

    const grammar = nodeChildProcess.spawnSync("pnpm", ["run", "build:grammars"], {
        cwd: EXT_ROOT,
        encoding: "utf-8",
        stdio: "inherit"
    })
    if (grammar.status !== 0) {
        throw new Error(`pnpm run build:grammars failed with ${grammar.status}`)
    }

    process.stdout.write("\n🔨 构建项目...\n")
    const result = nodeChildProcess.spawnSync("pnpm", ["run", "build"], {
        cwd: ROOT,
        encoding: "utf-8",
        stdio: "inherit"
    })
    if (result.status !== 0) {
        throw new Error(`pnpm run build failed with ${result.status}`)
    }
}

export function runVsce(mode: VsceMode): void {
    const args = ["-y", VSCE, mode]
    if (mode === "publish") {
        args.push("--skip-duplicate")
    }
    run("npx", args, EXT_ROOT)
}

function isInvokedDirectly(): boolean {
    const entry = process.argv[1]
    return entry !== undefined && nodeUrl.pathToFileURL(entry).href === import.meta.url
}

if (isInvokedDirectly()) {
    const restoreManifests = rewriteManifests()
    try {
        installDependencies()
        buildProject()
        runVsce("publish")
    } finally {
        restoreManifests()
    }
}
