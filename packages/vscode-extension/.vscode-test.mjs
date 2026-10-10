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
    // Windows 未开启开发者模式时没有创建符号链接的权限，目录联结不需要该权限
    process.platform === "win32" ? "junction" : "dir"
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

// 每次调用都会新建 workspace/user-data 临时目录，而一次完整套件按阶段会起 14 次本配置，
// 共残留 28 个目录；仅有 2 小时 TTL 兜底时，连续多轮运行会在 %TEMP% 里持续累积、拖慢
// 文件系统。退出时只清理本次调用自己创建的两个目录，不影响并发运行的其他实例。
function cleanupOwnTempDirs() {
    for (const dir of [workspaceDir, userDataDir]) {
        try {
            // 目录联结（workspace/node_modules）在递归删除时会被当链接摘掉，不会穿透到真实 node_modules
            nodeFs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 })
        } catch {}
    }
}
process.on("exit", cleanupOwnTempDirs)
for (const [signal, code] of [
    ["SIGINT", 130],
    ["SIGTERM", 143]
]) {
    process.on(signal, () => {
        cleanupOwnTempDirs()
        process.exit(code)
    })
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
