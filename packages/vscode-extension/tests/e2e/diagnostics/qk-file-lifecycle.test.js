const vscode = require("vscode")
const nodeAssert = require("node:assert")
const nodePath = require("node:path")

const { eventually, diagnosticsOf } = require("../utils/helpers")

describe("diagnostics/qk-file-lifecycle", function () {
    let importerUri, moduleUri, doc

    before(async function () {
        const ws = vscode.workspace.workspaceFolders[0]
        importerUri = vscode.Uri.file(nodePath.join(ws.uri.fsPath, "diagnostics", "importer.ts"))
        moduleUri = vscode.Uri.file(
            nodePath.join(ws.uri.fsPath, "diagnostics", "lifecycle-module.qk")
        )
    })

    it("2307 disappears after creating the imported .qk, restored after deletion", async function () {
        await vscode.workspace.fs.writeFile(
            importerUri,
            Buffer.from('import m from "./lifecycle-module.qk";\nexport const x = m;\n')
        )
        doc = await vscode.workspace.openTextDocument(importerUri)
        await vscode.window.showTextDocument(doc)

        // 基线：模块缺失 → 2307
        await eventually(
            () => {
                nodeAssert.ok(
                    diagnosticsOf(importerUri).some(d => d.code === 2307 || d.code === 2882),
                    "2307/2882 should appear while the module is missing"
                )
                return true
            },
            { message: "missing-module diagnostic did not arrive" }
        )

        // 创建模块 → 错误消失（实测 2-4s）
        await vscode.workspace.fs.writeFile(
            moduleUri,
            Buffer.from("<lang-js>\n    export default 1\n</lang-js>\n\n<span>m</span>\n")
        )
        await eventually(
            () => {
                const missing = diagnosticsOf(importerUri).filter(
                    d => d.code === 2307 || d.code === 2882
                )
                nodeAssert.strictEqual(
                    missing.length,
                    0,
                    "2307 should disappear after creating the module"
                )
                return true
            },
            { message: "error did not disappear after creating the .qk" }
        )

        // 删除模块 → 错误恢复
        await vscode.workspace.fs.delete(moduleUri)
        await eventually(
            () => {
                nodeAssert.ok(
                    diagnosticsOf(importerUri).some(d => d.code === 2307 || d.code === 2882),
                    "2307 should be restored after deleting the module"
                )
                return true
            },
            { message: "error did not recover after deleting the .qk" }
        )
    })
})
