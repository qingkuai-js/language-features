import nodeFs from "node:fs"
import nodeOs from "node:os"
import nodeUrl from "node:url"
import nodePath from "node:path"

import { defineConfig } from "@vscode/test-cli"

const runPrefix = "qk-e2e-"
const tempRoot = nodeOs.tmpdir()
const extRoot = nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url))

for (const name of nodeFs.readdirSync(tempRoot)) {
    if (!name.startsWith(runPrefix)) {
        continue
    }
    const full = nodePath.join(tempRoot, name)
    if (Date.now() - nodeFs.statSync(full).mtimeMs > 2 * 60 * 60 * 1000) {
        nodeFs.rmSync(full, { recursive: true, force: true })
    }
}

const workspaceDir = nodeFs.mkdtempSync(nodePath.join(tempRoot, runPrefix + "ws-"))
const userDataDir = nodeFs.mkdtempSync(nodePath.join(tempRoot, runPrefix + "user-"))
nodeFs.symlinkSync(
    nodePath.join(extRoot, "../../node_modules"),
    nodePath.join(workspaceDir, "node_modules"),
    "dir"
)
nodeFs.cpSync(nodePath.join(extRoot, "tests/e2e/_workspace"), workspaceDir, {
    recursive: true
})

if (process.env.QK_E2E_TSCONFIG) {
    nodeFs.writeFileSync(
        nodePath.join(workspaceDir, "tsconfig.json"),
        JSON.stringify({ compilerOptions: {} }, null, 4) + "\n",
        "utf-8"
    )
}

export default defineConfig({
    mocha: {
        ui: "bdd",
        color: true,
        timeout: 240000,
        require: [nodePath.join(extRoot, "tests/e2e/utils/global-setup.js")]
    },
    launchArgs: [
        workspaceDir,
        "--disable-workspace-trust",
        "--disable-updates",
        `--user-data-dir=${userDataDir}`
    ],
    label: "e2e",
    version: "1.140.0",
    files: "tests/e2e/**/*.test.js",
    extensionDevelopmentPath: extRoot
})
