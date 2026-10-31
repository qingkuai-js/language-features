const vscode = require("vscode")
const nodePath = require("node:path")
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

    it("refreshes diagnostics after .qingkuairc changes", async function () {
        const doc = await openFixture("config-resolution", "reload", "sub", "app.qk")
        await waitForError(doc.uri, MARK_REQUIRED_HINT)

        const configUri = fixtureUri("config-resolution", "reload", ".qingkuairc")
        try {
            await vscode.workspace.fs.writeFile(
                configUri,
                Buffer.from(JSON.stringify({ requireReactivityMark: false, allowConstReactive: false }))
            )

            await waitForError(doc.uri, CONST_REACTIVE_HINT)
            nodeAssert.ok(
                !hasError(doc.uri, MARK_REQUIRED_HINT),
                "requireReactivityMark should be gone after the config update"
            )
        } finally {
            await vscode.workspace.fs.writeFile(
                configUri,
                Buffer.from(JSON.stringify({ requireReactivityMark: true }))
            )
        }
    })

    it("refreshes diagnostics after an extends target changes", async function () {
        const doc = await openFixture("config-resolution", "extends-reload", "sub", "app.qk")
        await waitForError(doc.uri, CONST_REACTIVE_HINT)

        const baseUri = fixtureUri("config-resolution", "extends-reload", "base.json")
        try {
            await vscode.workspace.fs.writeFile(
                baseUri,
                Buffer.from(JSON.stringify({ requireReactivityMark: true, allowConstReactive: true }))
            )

            await waitForError(doc.uri, MARK_REQUIRED_HINT)
            nodeAssert.ok(
                !hasError(doc.uri, CONST_REACTIVE_HINT),
                "allowConstReactive should be gone after the extends target update"
            )
        } finally {
            await vscode.workspace.fs.writeFile(
                baseUri,
                Buffer.from(
                    JSON.stringify({ requireReactivityMark: false, allowConstReactive: false })
                )
            )
        }
    })

    it("reports an unparsable config through an error message", async function () {
        const messages = []
        const originalShowErrorMessage = vscode.window.showErrorMessage
        vscode.window.showErrorMessage = message => {
            messages.push(message)
            return Promise.resolve(undefined)
        }

        try {
            await openFixture("config-resolution", "invalid", "sub", "app.qk")
            await eventually(() => {
                nodeAssert.ok(
                    messages.some(message => message.includes("not valid JSON")),
                    `expected an invalid JSON message, got: ${JSON.stringify(messages)}`
                )
                return true
            })
        } finally {
            vscode.window.showErrorMessage = originalShowErrorMessage
        }
    })
})

function fixtureUri(...segments) {
    const ws = vscode.workspace.workspaceFolders[0]
    nodeAssert.ok(ws, "test workspace should be open")
    return vscode.Uri.file(nodePath.join(ws.uri.fsPath, ...segments))
}

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
