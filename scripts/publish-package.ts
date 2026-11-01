import type { PackageVersion } from "../types/script"

import nodeFs from "node:fs"
import nodePath from "node:path"
import nodeChildProcess from "node:child_process"

const ROOT = nodePath.resolve(import.meta.dirname, "..")
const OFFICIAL_REGISTRY = "https://registry.npmjs.org"

function run(command: string, args: string[], cwd: string): void {
    const result = nodeChildProcess.spawnSync(command, args, {
        cwd,
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

function isOnNpm(name: string, version: string): boolean {
    return (
        nodeChildProcess.spawnSync(
            "npm",
            ["view", `${name}@${version}`, "version", "--registry", OFFICIAL_REGISTRY],
            { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }
        ).status === 0
    )
}

function publish(dir: string): void {
    const packageDir = nodePath.join(ROOT, dir)
    const raw = nodeFs.readFileSync(nodePath.join(packageDir, "package.json"), "utf-8")
    const { name, version } = JSON.parse(raw) as PackageVersion

    // 重试与重复打 tag 都靠这里兜底：registry 上已有的版本直接放过，不会写入第二次
    // Retries and repeated tags stop here: a version already on the registry is never written again
    if (isOnNpm(name, version)) {
        console.log(`${name}@${version} is already published, nothing to do`)
        return
    }

    // catalog: 协议只有 pnpm 能解析，信任发布又依赖 npm 的 OIDC 实现，
    // 所以先用 pnpm pack 打出清单已解析的 tarball，再由 npm 发布这个 tarball
    // Only pnpm resolves the catalog: protocol and only npm implements trusted publishing,
    // so pnpm builds the tarball with a resolved manifest and npm publishes that tarball
    const before = new Set(nodeFs.readdirSync(packageDir))
    run("pnpm", ["pack"], packageDir)

    const packed = nodeFs
        .readdirSync(packageDir)
        .filter(file => file.endsWith(".tgz") && !before.has(file))
    if (packed.length !== 1) {
        throw new Error(`expected exactly one tarball, got ${JSON.stringify(packed)}`)
    }

    const tarball = nodePath.join(packageDir, packed[0])
    try {
        run("npx", ["-y", "npm@11", "publish", tarball, "--access", "public"], ROOT)
    } finally {
        nodeFs.rmSync(tarball, { force: true })
    }
}

const dir = process.argv[2]
if (dir === undefined) {
    console.error("usage: publish-package.ts <package-dir>")
    process.exitCode = 1
} else {
    try {
        publish(dir)
    } catch (error) {
        console.error(error)
        process.exitCode = 1
    }
}
