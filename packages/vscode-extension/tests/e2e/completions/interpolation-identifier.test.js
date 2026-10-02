const vscode = require("vscode")
const nodeAssert = require("node:assert")
const nodePath = require("node:path")

const { eventually } = require("../utils/helpers")

describe("completions/interpolation-identifier", function () {
    let doc

    /** 在文档中定位 '{co' 的插值补全位置（'co' 末尾） */
    function completionPosition() {
        const idx = doc.getText().indexOf("{co")
        nodeAssert.notStrictEqual(idx, -1, "fixture should contain a '{co' interpolation block")
        return doc.positionAt(idx + 3)
    }

    before(async function () {
        const ws = vscode.workspace.workspaceFolders[0]
        nodeAssert.ok(ws, "test workspace should be open")
        doc = await vscode.workspace.openTextDocument(
            nodePath.join(ws.uri.fsPath, "completions", "interpolation-identifier.qk")
        )
        await vscode.window.showTextDocument(doc)

        // 预热屏障：轮询直到 completion 返回非空（首次编译完成），
        // 把慢启动从断言路径中剔除
        await eventually(
            async () => {
                const list = await vscode.commands.executeCommand(
                    "vscode.executeCompletionItemProvider",
                    doc.uri,
                    completionPosition()
                )
                const labels = list.items.map(i =>
                    typeof i.label === "string" ? i.label : i.label.label
                )
                nodeAssert.ok(labels.length > 0, "completion still empty")
                return labels
            },
            { message: "warm-up timeout: completion still empty" }
        )
    })

    it("completes reactive variables declared in the script block inside template interpolations", async function () {
        const list = await vscode.commands.executeCommand(
            "vscode.executeCompletionItemProvider",
            doc.uri,
            completionPosition()
        )
        const labels = list.items.map(i => (typeof i.label === "string" ? i.label : i.label.label))
        nodeAssert(
            labels.includes("count"),
            `completions should include 'count' (reactive variable declared in the script block), got: ${JSON.stringify(labels)}`
        )
    })
})
