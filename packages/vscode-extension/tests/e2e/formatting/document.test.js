const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually } = require("../utils/helpers")

describe("formatting/document", function () {
    it("format a document with messy indentation and restore it via undo", async function () {
        const doc = await openFixture("formatting", "messy.qk")
        const before = doc.getText()

        // 冷启动下格式化链路渐进可用：轮询直到格式化真正改变文本，每次未生效的尝试不产生撤销记录
        await eventually(
            async () => {
                await vscode.commands.executeCommand("editor.action.formatDocument")
                nodeAssert.notStrictEqual(
                    doc.getText(),
                    before,
                    "formatting should change the document content"
                )
            },
            {
                message: "timed out waiting for the formatting pipeline to warm up"
            }
        )

        await vscode.commands.executeCommand("undo")
        nodeAssert.strictEqual(doc.getText(), before, "undo should restore the original document")
    })
})
