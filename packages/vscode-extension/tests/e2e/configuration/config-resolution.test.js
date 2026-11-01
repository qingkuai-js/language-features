const vscode = require("vscode")
const nodePath = require("node:path")
const nodeAssert = require("node:assert")

const {
    openFixture,
    eventually,
    diagnosticsOf,
    waitForNoErrors,
    waitForNoMatchingDiagnostics
} = require("../utils/helpers")

const CONST_REACTIVE_HINT = "allowConstReactive"
const MARK_REQUIRED_HINT = "must be explicitly marked"
const EMPTY_INTERPOLATION_HINT = "Empty interpolation expression block is not allowed"

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
        await waitForNoMatchingDiagnostics(closer.uri, [MARK_REQUIRED_HINT])
    })

    it("merges extends with the current file taking precedence", async function () {
        const doc = await openFixture("config-resolution", "extends", "sub", "app.qk")

        await waitForError(doc.uri, CONST_REACTIVE_HINT)
        await waitForNoMatchingDiagnostics(doc.uri, [MARK_REQUIRED_HINT])
    })

    it("refreshes diagnostics after .qingkuairc changes", async function () {
        const doc = await openFixture("config-resolution", "reload", "sub", "app.qk")
        await waitForError(doc.uri, MARK_REQUIRED_HINT)

        const configUri = fixtureUri("config-resolution", "reload", ".qingkuairc")
        try {
            await vscode.workspace.fs.writeFile(
                configUri,
                Buffer.from(
                    JSON.stringify({ requireReactivityMark: false, allowConstReactive: false })
                )
            )

            await waitForError(doc.uri, CONST_REACTIVE_HINT)
            await waitForNoMatchingDiagnostics(doc.uri, [MARK_REQUIRED_HINT])
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
                Buffer.from(
                    JSON.stringify({ requireReactivityMark: true, allowConstReactive: true })
                )
            )

            await waitForError(doc.uri, MARK_REQUIRED_HINT)
            await waitForNoMatchingDiagnostics(doc.uri, [CONST_REACTIVE_HINT])
        } finally {
            await vscode.workspace.fs.writeFile(
                baseUri,
                Buffer.from(
                    JSON.stringify({ requireReactivityMark: false, allowConstReactive: false })
                )
            )
        }
    })

    it("falls back to the current config after the extends target is removed", async function () {
        const doc = await openFixture(
            "config-resolution",
            "extends-delete",
            "conf",
            "src",
            "app.qk"
        )
        await waitForError(doc.uri, CONST_REACTIVE_HINT)

        const baseUri = fixtureUri("config-resolution", "extends-delete", "shared", "base.json")
        try {
            await vscode.workspace.fs.delete(baseUri, { useTrash: false })

            // 继承目标消失后应回退到当前文件的配置（默认 allowConstReactive 为 true）
            await waitForNoErrors(doc.uri)
        } finally {
            await vscode.workspace.fs.writeFile(
                baseUri,
                Buffer.from(JSON.stringify({ allowConstReactive: false }))
            )
        }
    })

    it("recovers after the extends target becomes valid", async function () {
        const doc = await openFixture(
            "config-resolution",
            "extends-recover",
            "conf",
            "src",
            "app.qk"
        )
        await waitForError(doc.uri, EMPTY_INTERPOLATION_HINT)

        const baseUri = fixtureUri("config-resolution", "extends-recover", "shared", "base.json")
        try {
            await vscode.workspace.fs.writeFile(
                baseUri,
                Buffer.from(JSON.stringify({ allowConstReactive: false }))
            )
            await waitForError(doc.uri, CONST_REACTIVE_HINT)
        } finally {
            await vscode.workspace.fs.writeFile(baseUri, Buffer.from("{ not json\n"))
        }
    })

    it("follows the whole extends chain", async function () {
        const doc = await openFixture("config-resolution", "extends-chain", "conf", "src", "app.qk")
        // requireReactivityMark 只出现在第二条继承链上，命中它说明更远的祖先也被读取；
        // allowConstReactive 来自更近的一层，覆盖了远处祖先的同名项
        // requireReactivityMark only exists further up the chain, so seeing it proves the
        // ancestor was read; allowConstReactive comes from the nearer layer and wins
        await waitForError(doc.uri, MARK_REQUIRED_HINT)
        await waitForNoMatchingDiagnostics(doc.uri, [CONST_REACTIVE_HINT])
    })

    it("cuts an extends chain that points back to a visited file", async function () {
        const warnings = []
        const originalShowWarningMessage = vscode.window.showWarningMessage
        vscode.window.showWarningMessage = message => {
            warnings.push(message)
            return Promise.resolve(undefined)
        }

        try {
            const doc = await openFixture(
                "config-resolution",
                "extends-cycle",
                "conf",
                "src",
                "app.qk"
            )
            // 链条被截断后仍应拿到已读取层的配置，而不是整份配置失效
            // Cutting the chain must keep the layers already read, not drop the config
            await waitForError(doc.uri, MARK_REQUIRED_HINT)
            await eventually(() => {
                nodeAssert.ok(
                    warnings.some(message => message.includes("Circular")),
                    `expected a circular extends warning, got: ${JSON.stringify(warnings)}`
                )
                return true
            })
        } finally {
            vscode.window.showWarningMessage = originalShowWarningMessage
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

    it("reloads every config sharing the same extends target", async function () {
        const first = await openFixture("config-resolution", "multi", "a", "app.qk")
        await waitForError(first.uri, CONST_REACTIVE_HINT)

        const second = await openFixture("config-resolution", "multi", "b", "app.qk")
        await waitForError(second.uri, CONST_REACTIVE_HINT)

        const baseUri = fixtureUri("config-resolution", "multi", "shared", "base.json")
        try {
            await vscode.workspace.fs.writeFile(
                baseUri,
                Buffer.from(
                    JSON.stringify({ requireReactivityMark: true, allowConstReactive: true })
                )
            )

            await waitForError(first.uri, MARK_REQUIRED_HINT)
            await waitForError(second.uri, MARK_REQUIRED_HINT)
            await waitForNoMatchingDiagnostics(first.uri, [CONST_REACTIVE_HINT])
            await waitForNoMatchingDiagnostics(second.uri, [CONST_REACTIVE_HINT])
        } finally {
            await vscode.workspace.fs.writeFile(
                baseUri,
                Buffer.from(
                    JSON.stringify({ requireReactivityMark: false, allowConstReactive: false })
                )
            )
        }
    })

    it("picks up a config added after resolution and drops it after removal", async function () {
        const doc = await openFixture("config-resolution", "add", "sub", "app.qk")
        await waitForError(doc.uri, EMPTY_INTERPOLATION_HINT)
        await waitForNoMatchingDiagnostics(doc.uri, [MARK_REQUIRED_HINT])

        const configUri = fixtureUri("config-resolution", "add", ".qingkuairc")
        try {
            await vscode.workspace.fs.writeFile(
                configUri,
                Buffer.from(JSON.stringify({ requireReactivityMark: true }))
            )
            await waitForError(doc.uri, MARK_REQUIRED_HINT)

            await vscode.workspace.fs.delete(configUri, { useTrash: false })
            await eventually(() => {
                nodeAssert.ok(
                    hasError(doc.uri, EMPTY_INTERPOLATION_HINT),
                    "the component should stay compiled"
                )
                nodeAssert.ok(
                    !hasError(doc.uri, MARK_REQUIRED_HINT),
                    "the removed config should not be applied"
                )
                return true
            })
        } finally {
            try {
                await vscode.workspace.fs.delete(configUri, { useTrash: false })
            } catch {}
        }
    })

    it("reports configuration problems through error and warning messages", async function () {
        const messages = []
        const originalShowErrorMessage = vscode.window.showErrorMessage
        const originalShowWarningMessage = vscode.window.showWarningMessage
        vscode.window.showErrorMessage = message => {
            messages.push({ kind: "error", message })
            return Promise.resolve(undefined)
        }
        vscode.window.showWarningMessage = message => {
            messages.push({ kind: "warning", message })
            return Promise.resolve(undefined)
        }

        try {
            await openFixture("config-resolution", "invalid-object", "app.qk")
            await openFixture("config-resolution", "extends-missing", "app.qk")
            await openFixture("config-resolution", "extends-bad", "app.qk")
            await openFixture("config-resolution", "extends-invalid", "app.qk")

            await eventually(() => {
                const expected = [
                    ["error", "must be a JSON object"],
                    ["warning", "does not exist"],
                    ["warning", "not valid JSON"],
                    ["warning", "Invalid extends field"]
                ]
                for (const [kind, fragment] of expected) {
                    nodeAssert.ok(
                        messages.some(
                            item => item.kind === kind && item.message.includes(fragment)
                        ),
                        `expected a ${kind} containing "${fragment}", got: ${JSON.stringify(messages)}`
                    )
                }
                return true
            })
        } finally {
            vscode.window.showErrorMessage = originalShowErrorMessage
            vscode.window.showWarningMessage = originalShowWarningMessage
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
