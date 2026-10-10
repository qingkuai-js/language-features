const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, posOf, eventually } = require("../utils/helpers")

function definitionPaths(defs) {
    return (defs ? (Array.isArray(defs) ? defs : [defs]) : []).map(l => (l.uri || l.targetUri).fsPath)
}

describe("navigation/lang-tag", function () {
    let child

    // 预热屏障：lang-js 标签的跨文件导航要先为两个夹具建好 TS 程序，冷启动下首个请求
    // 可能远超断言期限；先等首个 definition 命中，断言阶段只负责正确性、不承担建程序开销
    before(async function () {
        child = await openFixture("navigation", "lang-child.qk")
        await openFixture("navigation", "lang-parent.qk")

        const pos = posOf(child, "<lang-js", 1, -3)
        await eventually(
            async () => {
                const locs = definitionPaths(
                    await vscode.commands.executeCommand(
                        "vscode.executeDefinitionProvider",
                        child.uri,
                        pos
                    )
                )
                nodeAssert.ok(
                    locs.length > 0 && locs.every(p => p.endsWith("lang-child.qk")),
                    "warmup: lang-js tag definition should be available"
                )
            },
            { deadline: 60000, message: "lang-js navigation warmup timed out" }
        )

        // 跨文件引用检索要为整个工作区建 TS 程序，比定义跳转更重，必须单独预热
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
                    "warmup: lang-js tag references should be available"
                )
            },
            { deadline: 60000, message: "lang-js references warmup timed out" }
        )
    })

    it("lang-js tag name definition jumps to itself", async function () {
        // 位置：开始标签 lang-js 内部；冷启动下定义链路渐进可用，轮询直到命中
        const pos = posOf(child, "<lang-js", 1, -3)
        await eventually(
            async () => {
                const locs = definitionPaths(
                    await vscode.commands.executeCommand(
                        "vscode.executeDefinitionProvider",
                        child.uri,
                        pos
                    )
                )
                nodeAssert.ok(
                    locs.length > 0 && locs.every(p => p.endsWith("lang-child.qk")),
                    `lang-js tag definition should point to its own file, got: ${JSON.stringify(locs)}`
                )
            },
            { deadline: 20000, message: "lang-js tag definition timed out" }
        )
    })

    it("lang-js tag name references return cross-file usages", async function () {
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
            { deadline: 20000, message: "lang-js tag references timed out" }
        )
    })
})
