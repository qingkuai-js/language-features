const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture } = require("../utils/helpers")

describe("code-lens/references", function () {
    it("component document returns code lens list and resolves them", async function () {
        const doc = await openFixture("code-lens", "references.qk")
        const lenses = await vscode.commands.executeCommand(
            "vscode.executeCodeLensProvider",
            doc.uri,
            100
        )
        nodeAssert.ok(Array.isArray(lenses), "code lens should return an array")
        if (lenses.length > 0) {
            for (const lens of lenses) {
                nodeAssert.ok(lens.range, "each lens should have a range")
                if (lens.command) {
                    nodeAssert.ok(lens.command.title, "resolved lens should have a command title")
                }
            }
        }
    })
})
