const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, posOf } = require("../utils/helpers")

describe("navigation/component", function () {
    it("component tag definition jumps to component file", async function () {
        const app = await openFixture("navigation", "app.qk")
        const defs = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            app.uri,
            posOf(app, "<Main />", 1, -3)
        )
        const locs = defs ? (Array.isArray(defs) ? defs : [defs]) : []
        nodeAssert.ok(
            locs.length > 0 && locs.some(l => (l.uri || l.targetUri).fsPath.endsWith("main.qk")),
            `component tag definition should point to main.qk, got: ` +
                JSON.stringify(locs.map(l => (l.uri || l.targetUri).fsPath))
        )
    })
})
