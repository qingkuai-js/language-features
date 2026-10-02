const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually, diagnosticsOf } = require("../utils/helpers")

/** 等待指定文件出现至少一个 Error 级诊断（可选限定行号），返回命中诊断 */
async function waitForError(uri, linePredicate, message) {
    return eventually(
        () => {
            const errs = diagnosticsOf(uri).filter(
                d =>
                    d.severity === vscode.DiagnosticSeverity.Error &&
                    (!linePredicate || linePredicate(d.range.start.line))
            )
            nodeAssert.ok(errs.length > 0, message)
            return errs
        },
        { message: message + " (did not arrive before timeout)" }
    )
}

/** 等待指定文件错误诊断为空 */
async function waitForClean(uri) {
    return eventually(
        () => {
            const errs = diagnosticsOf(uri).filter(
                d => d.severity === vscode.DiagnosticSeverity.Error
            )
            nodeAssert.strictEqual(
                errs.length,
                0,
                `there should be no error diagnostics, got: ${errs.map(d => d.message)}`
            )
            return true
        },
        { message: "error diagnostics not cleared" }
    )
}

describe("diagnostics/type-validation", function () {
    it("event handler argument type mismatch should error", async function () {
        const doc = await openFixture("diagnostics", "type-event.qk")
        const errs = await waitForError(
            doc.uri,
            null,
            "event handler type error should produce a diagnostic"
        )
        nodeAssert.ok(
            errs.some(d => /number|assignable|类型/.test(d.message)),
            `event type error message should mention type mismatch, got: ${JSON.stringify(errs.map(d => d.message))}`
        )
    })

    it("no error when event handler types match", async function () {
        const doc = await openFixture("diagnostics", "type-event-ok.qk")
        await waitForClean(doc.uri)
    })

    it("refs binding type mismatch should error (component &refCount passes string to number)", async function () {
        await openFixture("diagnostics", "refs-child.qk")

        const doc = await openFixture("diagnostics", "type-refs.qk")
        await waitForError(doc.uri, null, "refs type mismatch should produce a diagnostic")
    })

    it("member access on dom node from &handle validated against declared type", async function () {
        const doc = await openFixture("diagnostics", "type-handle.qk")
        const errs = await waitForError(
            doc.uri,
            null,
            "&handle node member type error should produce a diagnostic"
        )
        nodeAssert.ok(
            errs.some(d => /nopeProp/.test(d.message)),
            `should report nopeProp does not exist on HTMLInputElement, got: ${JSON.stringify(errs.map(d => d.message))}`
        )
    })

    it("member type validation for #for destructured variables", async function () {
        const doc = await openFixture("diagnostics", "type-for.qk")
        const errs = await waitForError(
            doc.uri,
            null,
            "#for variable member type error should produce a diagnostic"
        )
        nodeAssert.ok(
            errs.some(d => /nopeProp/.test(d.message)),
            `should report nopeProp does not exist on number, got: ${JSON.stringify(errs.map(d => d.message))}`
        )
    })

    it("member type validation for #await/#then destructured variables", async function () {
        const doc = await openFixture("diagnostics", "type-await.qk")
        const errs = await waitForError(
            doc.uri,
            null,
            "#then variable member type error should produce a diagnostic"
        )
        nodeAssert.ok(
            errs.some(d => /nopeProp/.test(d.message)),
            `should report nopeProp does not exist on string, got: ${JSON.stringify(errs.map(d => d.message))}`
        )
    })

    it("correct usage of directives and bindings produces no errors", async function () {
        await openFixture("diagnostics", "refs-child.qk")

        const doc = await openFixture("diagnostics", "type-clean.qk")
        await waitForClean(doc.uri)
    })
})
