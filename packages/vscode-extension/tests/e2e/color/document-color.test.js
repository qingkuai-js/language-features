const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture } = require("../utils/helpers")

describe("color/document-color", function () {
    it("identifies color literals in style attributes", async function () {
        const doc = await openFixture("color", "document-color.qk")
        const colors = await vscode.commands.executeCommand(
            "vscode.executeDocumentColorProvider",
            doc.uri,
            new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length))
        )
        nodeAssert.ok(colors && colors.length >= 1, "should identify at least 1 color")
        nodeAssert.ok(colors[0].range.start.line >= 0, "color range should be valid")
    })
})
