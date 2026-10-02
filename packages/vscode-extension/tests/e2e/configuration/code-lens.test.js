const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually } = require("../utils/helpers")

describe("configuration/code-lens", function () {
    it("provides slot lens by default, gone after additionalCodeLens removal", async function () {
        const doc = await openFixture("code-lens", "slot.qk")
        const config = vscode.workspace.getConfiguration("qingkuai")
        const lensCount = async () =>
            (
                (await vscode.commands.executeCommand(
                    "vscode.executeCodeLensProvider",
                    doc.uri,
                    100
                )) || []
            ).length

        const beforeCount = await lensCount()
        nodeAssert.ok(
            beforeCount > 0,
            `expected lenses under default config (slot included), got ${beforeCount}`
        )

        // 配置写工作区级（临时 workspace 内，随运行销毁）：调试流的测试窗口住在
        // 主 VSCode 实例里，Global 级会写进本机真实 settings.json
        try {
            await config.update("additionalCodeLens", [], vscode.ConfigurationTarget.Workspace)

            await eventually(async () => {
                const afterCount = await lensCount()
                nodeAssert.ok(
                    afterCount < beforeCount,
                    `lens count should decrease after removing additionalCodeLens (${beforeCount} -> ${afterCount})`
                )
                return true
            })
        } finally {
            // undefined 即移除工作区覆盖；调试收尾期此调用可能被取消，吞掉
            // 避免已结束的用例再抛（done() multiple times）
            await config
                .update("additionalCodeLens", undefined, vscode.ConfigurationTarget.Workspace)
                .catch(() => {})
        }
    })
})
