const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, posOf, eventually } = require("../utils/helpers")

describe("signature/function-call", function () {
    it("provides signature help after function call parenthesis (with parameter list)", async function () {
        const doc = await openFixture("signature", "function-call.qk")
        const help = await eventually(async () => {
            const h = await vscode.commands.executeCommand(
                "vscode.executeSignatureHelpProvider",
                doc.uri,
                posOf(doc, "{add(", 1),
                "("
            )
            nodeAssert.ok(
                h && h.signatures && h.signatures.length > 0,
                "expected signature help to be returned"
            )
            return h
        })
        nodeAssert.match(
            help.signatures[help.activeSignature ?? 0].label,
            /add/,
            "expected the signature to correspond to the add function"
        )
    })
})
