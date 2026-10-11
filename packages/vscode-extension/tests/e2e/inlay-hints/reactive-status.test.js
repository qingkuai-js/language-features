const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually, inlaySignature } = require("../utils/helpers")

describe("inlay-hints/reactive-status", function () {
    let doc

    before(async function () {
        doc = await openFixture("completions", "interpolation-identifier.qk")
    })

    it("script block provides :reactive inlay hints at reactive variable declarations", async function () {
        const sig = await eventually(
            async () => {
                const hints = await vscode.commands.executeCommand(
                    "vscode.executeInlayHintProvider",
                    doc.uri,
                    new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length))
                )
                nodeAssert.strictEqual((hints || []).length, 2, "expected exactly 2 inlay hints")
                return inlaySignature(hints)
            },
            { message: "inlay hints did not arrive" }
        )
        nodeAssert.match(sig, /:reactive/, "the inlay label should be :reactive")
    })
})
