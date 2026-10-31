const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually, diagnosticsOf } = require("../utils/helpers")

// 未标记的顶层声明在 requireReactivityMark 下报 1074；被禁用的 const 响应式标记报 1070
const MARK_REQUIRED_HINT = "must be explicitly marked"
const CONST_REACTIVE_HINT = "allowConstReactive"

describe("configuration/config-resolution", function () {
    it("inherits the nearest .qingkuairc from a parent directory", async function () {
        const doc = await openFixture("config-resolution", "inherit", "sub", "app.qk")

        await waitForError(doc.uri, MARK_REQUIRED_HINT)
    })

    it("prefers the closer .qingkuairc over the inherited one", async function () {
        const inherited = await openFixture("config-resolution", "override", "app.qk")
        await waitForError(inherited.uri, MARK_REQUIRED_HINT)

        const closer = await openFixture("config-resolution", "override", "sub", "app.qk")
        await waitForError(closer.uri, CONST_REACTIVE_HINT)
        nodeAssert.ok(
            !hasError(closer.uri, MARK_REQUIRED_HINT),
            "the parent requireReactivityMark should be overridden by the closer config"
        )
    })

    it("merges extends with the current file taking precedence", async function () {
        const doc = await openFixture("config-resolution", "extends", "sub", "app.qk")

        await waitForError(doc.uri, CONST_REACTIVE_HINT)
        nodeAssert.ok(
            !hasError(doc.uri, MARK_REQUIRED_HINT),
            "requireReactivityMark from the extends target should be overridden"
        )
    })
})

function hasError(uri, fragment) {
    return diagnosticsOf(uri).some(
        diagnostic =>
            diagnostic.severity === vscode.DiagnosticSeverity.Error &&
            diagnostic.message.includes(fragment)
    )
}

async function waitForError(uri, fragment) {
    await eventually(() => {
        const messages = diagnosticsOf(uri).map(diagnostic => diagnostic.message)
        nodeAssert.ok(
            hasError(uri, fragment),
            `expected an error containing "${fragment}", got: ${JSON.stringify(messages)}`
        )
        return true
    })
}
