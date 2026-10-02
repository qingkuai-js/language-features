const vscode = require("vscode")
const nodeAssert = require("node:assert")
const nodePath = require("node:path")

const { openFixture, eventually, diagnosticsOf } = require("../utils/helpers")

const CHILD_NAME = "rename-child.qk"
const RENAMED_NAME = "rename-child-moved.qk"
const PARENT_NAME = "import-parent.qk"
const CHILD_CONTENT = "<p>rename-child</p>"

// 与 _workspace/rename/import-parent.qk 逐字节一致；rename 后恢复现场用
const PARENT_CONTENT = 'import RenameChild from "./rename-child.qk"\n\n<RenameChild />'

describe("rename/file-rename", function () {
    let wsPath
    before(async function () {
        const ws = vscode.workspace.workspaceFolders[0]
        wsPath = ws.uri.fsPath
    })

    const uriOf = name => vscode.Uri.file(nodePath.join(wsPath, "rename", name))

    it("import paths of importers updated after renaming a .qk component file @known-bug", async function () {
        // 【已确认 BUG】workspace.fs.rename 后导入方 import 路径不被更新——
        // 扩展与内置 TS 均未对 .qk 参与重命名编辑计算（代码中无 willRename 管线）。
        // 前置断言已保证 import 在重命名前解析成功，排除"本来就解析不了"的干扰。
        // 先就位 child + parent，并等待模块解析就绪（无 2307）
        await openFixture("rename", CHILD_NAME)

        const parent = await openFixture("rename", PARENT_NAME)
        await eventually(
            () => {
                const errs = diagnosticsOf(parent.uri).filter(d =>
                    /2307|Cannot find/.test(d.message)
                )
                nodeAssert.strictEqual(
                    errs.length,
                    0,
                    `precondition: import should resolve successfully, got: ${JSON.stringify(errs.map(d => d.message))}`
                )
                return true
            },
            { message: "import did not resolve before rename" }
        )

        let renamed = false
        try {
            // 真实文件系统重命名
            await vscode.workspace.fs.rename(uriOf(CHILD_NAME), uriOf(RENAMED_NAME), {
                overwrite: true
            })
            renamed = true

            // 断言导入方的 import 路径最终更新为新文件名
            await eventually(
                async () => {
                    const fresh = await vscode.workspace.openTextDocument(parent.uri)
                    const text = fresh.getText()
                    nodeAssert.ok(
                        text.includes('from "./rename-child-moved.qk"'),
                        `import path should be updated to the new file name after rename, got: ${JSON.stringify(text.slice(0, 200))}`
                    )
                    return true
                },
                { message: "import path not updated after rename" }
            )
        } finally {
            // 恢复原状，避免污染 workspace 内的其他测试
            if (renamed) {
                await vscode.workspace.fs.rename(uriOf(RENAMED_NAME), uriOf(CHILD_NAME), {
                    overwrite: true
                })
            }
            await vscode.workspace.fs.writeFile(uriOf(CHILD_NAME), Buffer.from(CHILD_CONTENT))
            await vscode.workspace.fs.writeFile(uriOf(PARENT_NAME), Buffer.from(PARENT_CONTENT))
        }
    })
})
