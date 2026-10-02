const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, posOf, eventually } = require("../utils/helpers")

describe("navigation/identifier", function () {
    let doc

    before(async function () {
        doc = await openFixture("navigation", "main.qk")

        // 预热屏障：冷启动下导航链路渐进可用，等待首个 definition 返回后再进入断言
        await eventually(
            async () => {
                const defs = await vscode.commands.executeCommand(
                    "vscode.executeDefinitionProvider",
                    doc.uri,
                    posOf(doc, "{count}", 1, -1)
                )
                nodeAssert.ok(
                    defs && defs.length > 0,
                    "warmup: interpolation should have a definition jump"
                )
            },
            { message: "navigation warmup timed out" }
        )
    })

    it("definition: template interpolation → script block declaration", async function () {
        const defs = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            doc.uri,
            posOf(doc, "{count}", 1, -1)
        )
        nodeAssert.ok(defs && defs.length > 0, "interpolation should have a definition jump")

        const loc = Array.isArray(defs) ? defs[0] : defs.location
        const range = loc.range || loc.targetSelectionRange
        nodeAssert.strictEqual(
            range.start.line,
            1,
            `definition should point to the declaration on line 2 of the script block, got ${JSON.stringify(range)}`
        )
    })

    it("references: declaration → usage in template @known-bug", async function () {
        const refs = await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            doc.uri,
            posOf(doc, "let count", 1, 4)
        )
        nodeAssert.ok(
            refs && refs.length >= 1,
            "declaration should find at least 1 reference in the template"
        )

        const inTemplate = refs.some(r => r.range.start.line === 4)
        nodeAssert.ok(
            inTemplate,
            `references should include the usage on line 5 of the template, got: ${JSON.stringify(refs)}`
        )
    })

    it("implementation lookup returns results without error", async function () {
        const impls = await vscode.commands.executeCommand(
            "vscode.executeImplementationProvider",
            doc.uri,
            posOf(doc, "{count}", 1, -1)
        )
        nodeAssert.ok(Array.isArray(impls) || impls, "implementation lookup should return results")
    })
})
