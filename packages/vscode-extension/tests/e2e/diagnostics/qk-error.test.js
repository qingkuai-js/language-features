const vscode = require("vscode")
const nodeAssert = require("node:assert")
const nodePath = require("node:path")

const { eventually, diagnosticsOf } = require("../utils/helpers")

describe("diagnostics/qk-error", function () {
    let uri, doc

    before(async function () {
        const ws = vscode.workspace.workspaceFolders[0]
        uri = vscode.Uri.file(nodePath.join(ws.uri.fsPath, "diagnostics", "qk-error.qk"))
    })

    it("empty interpolation block error appears, clears after fix", async function () {
        await vscode.workspace.fs.writeFile(uri, Buffer.from("<p>{}</p>\n"))
        doc = await vscode.workspace.openTextDocument(uri)
        await vscode.window.showTextDocument(doc)

        // 错误到达（1001 空插值块，链路为 tsserver 插件代理）
        await eventually(
            () => {
                const diags = diagnosticsOf(uri)
                nodeAssert.ok(
                    diags.some(d => d.severity === vscode.DiagnosticSeverity.Error),
                    "compile error diagnostic should appear"
                )
                return true
            },
            { message: "error diagnostic did not arrive" }
        )

        // 修复后清除
        const edit = new vscode.WorkspaceEdit()
        edit.replace(uri, new vscode.Range(0, 3, 0, 5), "1")
        await vscode.workspace.applyEdit(edit)
        await doc.save()

        await eventually(
            () => {
                const errs = diagnosticsOf(uri).filter(
                    d => d.severity === vscode.DiagnosticSeverity.Error
                )
                nodeAssert.strictEqual(
                    errs.length,
                    0,
                    `errors should be cleared, got: ${errs.map(d => d.message)}`
                )
                return true
            },
            { message: "error diagnostic was not cleared" }
        )
    })
})
