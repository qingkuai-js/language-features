const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually } = require("../utils/helpers")

describe("completions/component-tag", function () {
    it("suggests workspace components when typing < and a component name prefix", async function () {
        const doc = await openFixture("navigation", "app.qk")
        const text = doc.getText()
        const idx = text.indexOf("<Main") // 在已有组件标签的前缀处请求补全
        nodeAssert.notStrictEqual(idx, -1, "fixture should contain a <Main tag")

        // workspace 组件索引冷启动渐进到达，轮询关键组件出现后再断言
        await eventually(
            async () => {
                const list = await vscode.commands.executeCommand(
                    "vscode.executeCompletionItemProvider",
                    doc.uri,
                    doc.positionAt(idx + 2) // '<M' 之间
                )
                const labels = list.items.map(i =>
                    typeof i.label === "string" ? i.label : i.label.label
                )
                nodeAssert(
                    labels.includes("Main"),
                    `component completions should include 'Main', got: ${JSON.stringify(labels)}`
                )
            },
            { message: "component index readiness timeout" }
        )
    })
})
