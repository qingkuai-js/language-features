const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually, waitForWorkspaceReady } = require("../utils/helpers")

describe("infra/restart-language-server", function () {
    let doc

    before(async function () {
        doc = await openFixture("completions", "interpolation-identifier.qk")
    })

    it("completions recover after Restart Language Server", async function () {
        await vscode.commands.executeCommand("qingkuai.restartLanguageServer")
        await eventually(
            async () => {
                const list = await vscode.commands.executeCommand(
                    "vscode.executeCompletionItemProvider",
                    doc.uri,
                    doc.positionAt(doc.getText().indexOf("{co") + 3)
                )
                const labels = (list.items || []).map(i =>
                    typeof i.label === "string" ? i.label : i.label.label
                )
                nodeAssert.ok(
                    labels.includes("count"),
                    `completions should recover after restart, got: ${JSON.stringify(labels)}`
                )
                return true
            },
            // bootstrap 级等待（例外于全局 5s 结果等待政策）：restart 重建整条
            // LS+tsserver 链路，耗时等价冷启动，不由结果等待 deadline 承担
            { deadline: 60000, message: "completion pipeline did not recover after restart" }
        )

        // 重启会重建整条链路，结束时等新语言服务的工作区就绪信号，
        // 保证本套件无论在什么顺序执行，后续套件都从已就绪状态开始
        await waitForWorkspaceReady(90000)
    })
})
