const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, posOf, eventually } = require("../utils/helpers")

describe("navigation/lang-tag", function () {
    it("lang-js tag name definition jumps to itself", async function () {
        const child = await openFixture("navigation", "lang-child.qk")
        await openFixture("navigation", "lang-parent.qk")

        // 位置：开始标签 lang-js 内部；冷启动下定义链路渐进可用，轮询直到命中
        const pos = posOf(child, "<lang-js", 1, -3)
        await eventually(
            async () => {
                const defs = await vscode.commands.executeCommand(
                    "vscode.executeDefinitionProvider",
                    child.uri,
                    pos
                )
                const locs = (defs ? (Array.isArray(defs) ? defs : [defs]) : []).map(
                    l => (l.uri || l.targetUri).fsPath
                )
                nodeAssert.ok(
                    locs.length > 0 && locs.every(p => p.endsWith("lang-child.qk")),
                    `lang-js tag definition should point to its own file, got: ${JSON.stringify(locs)}`
                )
            },
            { message: "lang-js tag definition timed out" }
        )
    })

    it("lang-js tag name references return cross-file usages", async function () {
        const child = await openFixture("navigation", "lang-child.qk")
        await openFixture("navigation", "lang-parent.qk")

        const pos = posOf(child, "<lang-js", 1, -3)
        await eventually(
            async () => {
                const refs =
                    (await vscode.commands.executeCommand(
                        "vscode.executeReferenceProvider",
                        child.uri,
                        pos
                    )) || []
                nodeAssert.ok(
                    refs.some(l => l.uri.fsPath.endsWith("lang-parent.qk")),
                    `lang-js tag references should include import/usage in lang-parent.qk, got: ` +
                        JSON.stringify(refs.map(l => l.uri.fsPath + "@" + l.range.start.line))
                )
                return refs
            },
            { message: "lang-js tag references timed out" }
        )
    })
})
