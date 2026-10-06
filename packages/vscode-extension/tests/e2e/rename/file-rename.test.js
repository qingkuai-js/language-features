const vscode = require("vscode")
const nodePath = require("node:path")
const nodeAssert = require("node:assert")

const { openFixture, eventually, diagnosticsOf } = require("../utils/helpers")

const CHILD_NAME = "rename-child.qk"
const RENAMED_NAME = "rename-child-moved.qk"
const PARENT_NAME = "import-parent.qk"
const CHILD_CONTENT = "<p>rename-child</p>"

// 与 _workspace/rename/import-parent.qk 逐字节一致；rename 后恢复现场用
const PARENT_CONTENT = 'import RenameChild from "./rename-child.qk"\n\n<RenameChild />'

// 扩展按脚本块语言读取 typescript/javascript.updateImportsOnFileMove.enabled，
// 两节都设为 always 以跳过询问弹窗（e2e 无法应答模态框）
const UPDATE_IMPORTS_SETTINGS = [
    "javascript.updateImportsOnFileMove.enabled",
    "typescript.updateImportsOnFileMove.enabled"
]

describe("rename/file-rename", function () {
    let wsPath
    before(async function () {
        const ws = vscode.workspace.workspaceFolders[0]
        wsPath = ws.uri.fsPath
    })

    const uriOf = name => vscode.Uri.file(nodePath.join(wsPath, "rename", name))

    it("import paths of importers updated after renaming a .qk component file", async function () {
        // 前置断言保证 import 在重命名前解析成功，排除"本来就解析不了"的干扰
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

        for (const setting of UPDATE_IMPORTS_SETTINGS) {
            await vscode.workspace
                .getConfiguration()
                .update(setting, "always", vscode.ConfigurationTarget.Workspace)
        }

        let renamed = false
        try {
            // workspace.fs.rename 不触发 onWillRenameFiles（VSCode 文档约定），
            // 只有 applyEdit + renameFile 与资源管理器手势会进入扩展的重命名管线
            const renameEdit = new vscode.WorkspaceEdit()
            renameEdit.renameFile(uriOf(CHILD_NAME), uriOf(RENAMED_NAME), { overwrite: true })
            renamed = await vscode.workspace.applyEdit(renameEdit)

            // 断言导入方的 import 路径最终更新为新文件名。
            // resolveImportExtension 默认开启，更新的导入路径不带 .qk 扩展名
            await eventually(
                async () => {
                    const fresh = await vscode.workspace.openTextDocument(parent.uri)
                    const text = fresh.getText()
                    nodeAssert.ok(
                        text.includes('from "./rename-child-moved"'),
                        `import path should be updated to the new file name after rename, got: ${JSON.stringify(text.slice(0, 200))}`
                    )
                    return true
                },
                { message: "import path not updated after rename" }
            )
        } finally {
            // 恢复原状，避免污染 workspace 内的其他测试
            for (const setting of UPDATE_IMPORTS_SETTINGS) {
                await vscode.workspace
                    .getConfiguration()
                    .update(setting, undefined, vscode.ConfigurationTarget.Workspace)
                    .catch(() => {})
            }
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
