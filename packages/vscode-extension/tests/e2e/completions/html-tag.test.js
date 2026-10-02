const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually } = require("../utils/helpers")

describe("completions/html-tag", function () {
    let doc

    before(async function () {
        doc = await openFixture("completions", "html-tag.qk")

        // 全局就绪屏障已保证链路可用，此处只等本文件补全非空
        await eventually(
            async () => {
                const list = await vscode.commands.executeCommand(
                    "vscode.executeCompletionItemProvider",
                    doc.uri,
                    doc.positionAt(3)
                )
                nodeAssert.ok(list.items.length > 0, "completions should not be empty")
                return true
            },
            { message: "completion pipeline warm-up timeout" }
        )
    })

    it("completes HTML tags at a template top-level abbreviation", async function () {
        const list = await vscode.commands.executeCommand(
            "vscode.executeCompletionItemProvider",
            doc.uri,
            doc.positionAt(3)
        )
        const labels = list.items.map(i => (typeof i.label === "string" ? i.label : i.label.label))
        nodeAssert(
            ["div", "slot"].every(t => labels.includes(t)),
            `tag completions should include built-in tags div/slot, got: ${JSON.stringify(labels)}`
        )
    })

    it("abbreviation expansions provide emmet completions", async function () {
        const list = await vscode.commands.executeCommand(
            "vscode.executeCompletionItemProvider",
            doc.uri,
            doc.positionAt(3)
        )
        const emmet = list.items.find(i => (i.detail || "").includes("Emmet"))
        nodeAssert.ok(emmet, "abbreviation positions should provide Emmet completion items")
    })
})
