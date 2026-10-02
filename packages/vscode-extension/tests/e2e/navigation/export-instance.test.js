const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, posOf, eventually } = require("../utils/helpers")

/** 等待跨文件索引就绪后执行 definition 请求 */
function definitionsWhenReady(doc, pos, mustContain) {
    return eventually(async () => {
        const defs = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            doc.uri,
            pos
        )
        const paths = (defs ? (Array.isArray(defs) ? defs : [defs]) : []).map(
            l => (l.uri || l.targetUri).fsPath
        )
        nodeAssert.ok(
            paths.some(p => p.endsWith(mustContain)),
            `definition should include ${mustContain}, got: ${JSON.stringify(paths)}`
        )
        return paths
    })
}

describe("navigation/export-instance", function () {
    it("instance property definition jumps back to child component export declaration @known-bug", async function () {
        // 【已确认 BUG 家族】definition 返回空——与组件 definition 空同根因
        // （import .qk 的模块解析链失效，跨文件导航全部断链）。
        await openFixture("navigation", "export-child.qk")

        const parent = await openFixture("navigation", "export-parent.qk")

        // definition 请求位置：inst.exportCount 的 exportCount 内部
        const pos = posOf(parent, "inst.exportCount", 1, -3)
        const targets = await definitionsWhenReady(parent, pos, "export-child.qk")
        nodeAssert.ok(
            targets.some(p => p.endsWith("export-child.qk")),
            `instance property definition should point to export-child.qk, got: ${JSON.stringify(targets)}`
        )
    })

    it("exported identifier references cover instance property usage in parent component @known-bug", async function () {
        const child = await openFixture("navigation", "export-child.qk")
        await openFixture("navigation", "export-parent.qk")

        // references 请求位置：export let exportCount 的标识符内部
        const pos = posOf(child, "export let exportCount", 1, -3)
        await eventually(
            async () => {
                const refs =
                    (await vscode.commands.executeCommand(
                        "vscode.executeReferenceProvider",
                        child.uri,
                        pos
                    )) || []
                nodeAssert.ok(
                    refs.some(l => l.uri.fsPath.endsWith("export-parent.qk")),
                    `exported identifier references should include usage in export-parent.qk, got: ` +
                        JSON.stringify(refs.map(l => l.uri.fsPath + "@" + l.range.start.line))
                )
                return refs
            },
            { message: "exported identifier references timed out" }
        )
    })
})
