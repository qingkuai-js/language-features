const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually, diagnosticsOf } = require("../utils/helpers")

describe("diagnostics/slot-type", function () {
    it("slot context accessing an undeclared member should error", async function () {
        await openFixture("diagnostics", "slot-child.qk")

        const doc = await openFixture("diagnostics", "slot-parent-bad.qk")
        await eventually(
            () => {
                const errs = diagnosticsOf(doc.uri).filter(
                    d => d.severity === vscode.DiagnosticSeverity.Error
                )
                nodeAssert.ok(
                    errs.some(d => /nopeMember/.test(d.message)),
                    `slot context undeclared member should report TS2339, got: ${JSON.stringify(errs.map(d => d.message))}`
                )
                return true
            },
            { message: "slot context type error diagnostic did not arrive" }
        )
    })

    it("slot context accessing a declared member should not error", async function () {
        await openFixture("diagnostics", "slot-child.qk")

        const doc = await openFixture("diagnostics", "slot-parent-good.qk")
        await eventually(
            () => {
                const errs = diagnosticsOf(doc.uri).filter(
                    d => d.severity === vscode.DiagnosticSeverity.Error
                )
                nodeAssert.strictEqual(
                    errs.length,
                    0,
                    `correct slot context access should not error, got: ${JSON.stringify(errs.map(d => d.message))}`
                )
                return true
            },
            { message: "error diagnostic present for correct slot usage" }
        )
    })
})
