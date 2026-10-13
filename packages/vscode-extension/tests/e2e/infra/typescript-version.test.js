const vscode = require("vscode")
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
})
