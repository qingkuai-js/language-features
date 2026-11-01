import type { PackageVersion, ServerManifest } from "../types/script"

import nodeFs from "node:fs"
import nodePath from "node:path"

const PACKAGE_DIR = nodePath.resolve(import.meta.dirname, "../packages/mcp-server")

const { version } = JSON.parse(
    nodeFs.readFileSync(nodePath.join(PACKAGE_DIR, "package.json"), "utf-8")
) as PackageVersion
const manifestPath = nodePath.join(PACKAGE_DIR, "server.json")
const manifest = JSON.parse(nodeFs.readFileSync(manifestPath, "utf-8")) as ServerManifest

// 注册表要求清单版本与 npm 包版本一致，发版时以包版本为准回写。
for (const pkg of manifest.packages ?? []) {
    pkg.version = version
}
manifest.version = version

nodeFs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 4)}\n`, "utf-8")
console.log(`server.json synced to ${version}`)
