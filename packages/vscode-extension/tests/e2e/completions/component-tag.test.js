const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, posOf, eventually, labelOf } = require("../utils/helpers")

describe("completions/component-tag", function () {
    it("suggests workspace components when typing < and a component name prefix", async function () {
        const doc = await openFixture("navigation", "app.qk")
        const text = doc.getText()
        const idx = text.indexOf("<Main") // 在已有组件标签的前缀处请求补全
        nodeAssert.notStrictEqual(idx, -1, "fixture should contain a <Main tag")

        // workspace 组件索引冷启动渐进到达，轮询关键组件出现后再断言
        await eventually(
            async () => {
                const list = await vscode.commands.executeCommand(
                    "vscode.executeCompletionItemProvider",
                    doc.uri,
                    doc.positionAt(idx + 2) // '<M' 之间
                )
                const labels = list.items.map(labelOf)
                nodeAssert(
                    labels.includes("Main"),
                    `component completions should include 'Main', got: ${JSON.stringify(labels)}`
                )
            },
            { message: "component index readiness timeout" }
        )
    })

    it("suggests unimported workspace components with an auto-import edit at bare names", async function () {
        const doc = await openFixture("completions", "component-unimported.qk")
        const pos = posOf(doc, "AChild", 1, -1)

        const hit = await eventually(
            async () => {
                const list = await vscode.commands.executeCommand(
                    "vscode.executeCompletionItemProvider",
                    doc.uri,
                    pos
                )
                const item = list.items.find(i => labelOf(i) === "AChild")
                nodeAssert.ok(
                    item,
                    `component completions should include 'AChild' (not 'Achild'), got: ${JSON.stringify(list.items.map(labelOf))}`
                )
                return item
            },
            { message: "workspace component index readiness timeout" }
        )

        nodeAssert.match(
            hit.detail,
            /Add import from "\.\/a-child/,
            "unimported component item should be annotated with its source file"
        )
        const importEdit = (hit.additionalTextEdits || [])[0]
        nodeAssert.ok(
            importEdit && /import AChild from "\.\/a-child(\.qk)?"/.test(importEdit.newText),
            `accepting the suggestion should add an AChild import edit, got: ${JSON.stringify(importEdit)}`
        )
    })

    it("suggests unimported components in a file without any script block", async function () {
        // 连 lang 块都没有的纯模板文件：接受建议后应自动写入嵌入脚本块与导入语句
        // （无脚本块时导入插入位置兜底到文件头，formatImportStatement 在文件头
        // 生成完整的 lang 块包裹）
        const doc = await openFixture("completions", "component-unimported-bare.qk")
        const pos = posOf(doc, "AChild", 1, -1)

        const hit = await eventually(
            async () => {
                const list = await vscode.commands.executeCommand(
                    "vscode.executeCompletionItemProvider",
                    doc.uri,
                    pos
                )
                const item = list.items.find(
                    i => labelOf(i) === "AChild" && (i.additionalTextEdits || []).length > 0
                )
                nodeAssert.ok(
                    item,
                    `component completions should include 'AChild' with an auto-import edit, got: ${JSON.stringify(list.items.map(labelOf))}`
                )
                return item
            },
            { message: "workspace component index readiness timeout" }
        )

        const mainText = typeof hit.insertText === "string" ? hit.insertText : hit.insertText?.value
        const rawRange = hit.range || hit.textEdit?.range || hit.textEdit?.replace
        const mainRange = Array.isArray(rawRange) ? rawRange[rawRange.length - 1] : rawRange
        nodeAssert.ok(
            mainText && mainRange,
            `component item should carry a main insert (text: ${JSON.stringify(mainText)}, range: ${JSON.stringify(rawRange)})`
        )
        const edit = new vscode.WorkspaceEdit()
        edit.replace(doc.uri, mainRange, mainText)
        for (const extra of hit.additionalTextEdits || []) {
            edit.replace(doc.uri, extra.range, extra.newText)
        }
        nodeAssert.ok(await vscode.workspace.applyEdit(edit), "acceptance edit should apply")

        const text = doc.getText()
        const blockMatch = text.match(/<lang-(js|ts)>/)
        nodeAssert.ok(
            blockMatch,
            `accepting the suggestion should create an embedded script block, got: ${JSON.stringify(text)}`
        )
        const tag = blockMatch[1]
        nodeAssert.match(
            text,
            new RegExp(
                `<lang-${tag}>\\n\\s*import AChild from "\\.\\/a-child(?:\\.qk)?"\\s*;?\\n<\\/lang-${tag}>`
            ),
            "the embedded script block should contain the auto import statement"
        )
    })
})
