const vscode = require("vscode")
const nodeFs = require("node:fs")
const nodeOs = require("node:os")
const nodePath = require("node:path")
const nodeAssert = require("node:assert")

const { openFixture } = require("../utils/helpers")

// qingkuai 编译器使用的 typescript 由扩展解析后注入（见 packages/vscode-extension/src/typescript.ts），
// 状态栏按钮展示它并允许切换，这里验证解析结果与切换是否生效
// The extension resolves the typescript the qingkuai compiler uses and injects it (see
// packages/vscode-extension/src/typescript.ts); the status bar button shows it and lets you switch,
// so this suite covers the resolution and the switch.
describe("infra/typescript-version", function () {
    before(async function () {
        await openFixture("completions", "interpolation-identifier.qk")
    })

    it("resolves the typescript installation used by the compiler", async function () {
        const info = await vscode.commands.executeCommand("qingkuai.getTypeScriptInfo")
        nodeAssert.ok(info, "a typescript installation should be resolved")
        nodeAssert.match(info.entry, /typescript[\\/]lib[\\/]typescript\.js$/)
        nodeAssert.ok(
            ["bundled", "workspace", "setting"].includes(info.source),
            `unexpected source: ${info.source}`
        )
        nodeAssert.match(String(info.version), /^\d+\.\d+\.\d+/, `version: ${info.version}`)
    })

    it("registers the typescript picker command", async function () {
        const commands = await vscode.commands.getCommands(true)
        nodeAssert.ok(commands.includes("qingkuai.selectTypeScriptPath"))
    })

    it("honours qingkuai.typescriptPath and resets back to automatic", async function () {
        const config = vscode.workspace.getConfiguration("qingkuai")
        const resolved = await vscode.commands.executeCommand("qingkuai.getTypeScriptInfo")
        nodeAssert.notStrictEqual(resolved.source, "setting")

        await config.update("typescriptPath", resolved.entry, vscode.ConfigurationTarget.Global)
        try {
            const configured = await vscode.commands.executeCommand("qingkuai.getTypeScriptInfo")
            nodeAssert.strictEqual(configured.source, "setting")
            nodeAssert.strictEqual(configured.entry, resolved.entry)
            nodeAssert.strictEqual(configured.version, resolved.version)
        } finally {
            await config.update("typescriptPath", undefined, vscode.ConfigurationTarget.Global)
        }

        const automatic = await vscode.commands.executeCommand("qingkuai.getTypeScriptInfo")
        nodeAssert.notStrictEqual(automatic.source, "setting")
        nodeAssert.strictEqual(automatic.entry, resolved.entry)
    })

    // 设置里的入口按"能否真正加载"判定：加载失败时回退到探测到的安装，并把原因报给状态栏
    // A configured entry counts as usable only when it really loads: a failing one falls back to a
    // detected installation and its reason is reported to the status bar
    it("falls back and reports the failure when the configured path cannot be loaded", async function () {
        const config = vscode.workspace.getConfiguration("qingkuai")
        const automatic = await vscode.commands.executeCommand("qingkuai.getTypeScriptInfo")
        const missing = nodePath.join(nodeOs.tmpdir(), "qingkuai-missing-typescript.js")

        await config.update("typescriptPath", missing, vscode.ConfigurationTarget.Global)
        try {
            const resolved = await vscode.commands.executeCommand("qingkuai.getTypeScriptInfo")
            nodeAssert.ok(resolved.failure, "the load failure should be reported")
            nodeAssert.strictEqual(resolved.failure.entry, missing)
            nodeAssert.match(resolved.failure.message, /Cannot find module/)
            nodeAssert.notStrictEqual(resolved.source, "setting")
            nodeAssert.strictEqual(resolved.entry, automatic.entry, "should fall back")
        } finally {
            await config.update("typescriptPath", undefined, vscode.ConfigurationTarget.Global)
        }

        const restored = await vscode.commands.executeCommand("qingkuai.getTypeScriptInfo")
        nodeAssert.strictEqual(restored.failure, undefined, "clearing the setting clears the failure")
        nodeAssert.strictEqual(restored.entry, automatic.entry)
    })

    // 目录也是合法的入口：Node 会按 package.json 的 main 解析它，只判断"是否是文件"会误判
    // A directory is a valid entry as well: Node resolves it through the package.json "main", so
    // checking "is a file" would reject a working path
    it("accepts a directory whose package main is a typescript entry", async function () {
        const config = vscode.workspace.getConfiguration("qingkuai")
        const packageRoot = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "qingkuai-typescript-"))
        nodeFs.mkdirSync(nodePath.join(packageRoot, "lib"))
        nodeFs.writeFileSync(
            nodePath.join(packageRoot, "package.json"),
            JSON.stringify({ name: "typescript", version: "9.9.9", main: "lib/typescript.js" })
        )
        nodeFs.writeFileSync(
            nodePath.join(packageRoot, "lib", "typescript.js"),
            "exports.createSourceFile = () => {}\nexports.version = '9.9.9'\n"
        )

        await config.update("typescriptPath", packageRoot, vscode.ConfigurationTarget.Global)
        try {
            const resolved = await vscode.commands.executeCommand("qingkuai.getTypeScriptInfo")
            nodeAssert.strictEqual(resolved.failure, undefined)
            nodeAssert.strictEqual(resolved.source, "setting")
            nodeAssert.strictEqual(resolved.entry, packageRoot)
            nodeAssert.strictEqual(resolved.version, "9.9.9", "the version comes from the loaded module")
        } finally {
            await config.update("typescriptPath", undefined, vscode.ConfigurationTarget.Global)
            nodeFs.rmSync(packageRoot, { recursive: true, force: true })
        }
    })
})
