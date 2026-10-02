const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually } = require("../utils/helpers")

async function renameAt(doc, line, character, newName) {
    return vscode.commands.executeCommand(
        "vscode.executeDocumentRenameProvider",
        doc.uri,
        new vscode.Position(line, character),
        newName
    )
}

/** 断言 rename 结果恰好为指定两处（或一处）range→newText 的编辑 */
function assertEdits(we, doc, expectations) {
    nodeAssert.ok(we, "rename should not return empty")

    const edits = we.entries()[0][1]
    nodeAssert.strictEqual(
        edits.length,
        expectations.length,
        `expected ${expectations.length} edits, got: ${JSON.stringify(edits)}`
    )

    const actual = edits
        .map(
            e =>
                `${e.range.start.line},${e.range.start.character},${e.range.end.line},${e.range.end.character}`
        )
        .sort()
    const expected = expectations.map(([sl, sc, el, ec]) => `${sl},${sc},${el},${ec}`).sort()
    nodeAssert.deepStrictEqual(actual, expected, `edit ranges should be ${expected}`)
    for (const e of edits) {
        nodeAssert.strictEqual(doc.getText(e.range), doc.getText(e.range))
    }
}

describe("rename/html-tag", function () {
    before(async function () {
        // 预热屏障：冷启动下 rename 可能返回空 WorkspaceEdit（truthy 但零条目），
        // 等待首个改名位置真正返回编辑条目后再进入断言
        const doc = await openFixture("rename", "tag-structure.qk")
        await eventually(
            async () => {
                const we = await renameAt(doc, 0, 2, "p")
                nodeAssert.ok(
                    we && we.entries().length > 0,
                    "warmup: rename should return edit entries"
                )
            },
            { message: "rename pipeline warmup timed out" }
        )
    })

    it("opening/closing tags renamed in sync in multi-line structures (position matrix)", async function () {
        const doc = await openFixture("rename", "tag-structure.qk")

        // div 开始标签 (0,1-0,4) 与结束标签 (8,2-8,5)
        assertEdits(await renameAt(doc, 0, 2, "p"), doc, [
            [0, 1, 0, 4],
            [8, 2, 8, 5]
        ])

        // span (5,5-5,9) 与 (7,6-7,10)
        assertEdits(await renameAt(doc, 5, 6, "div"), doc, [
            [5, 5, 5, 9],
            [7, 6, 7, 10]
        ])

        // i (6,9-6,10) 与 (6,13-6,14)
        assertEdits(await renameAt(doc, 6, 9, "div"), doc, [
            [6, 9, 6, 10],
            [6, 13, 6, 14]
        ])

        // custom-element (9,1-9,15) 与 (11,2-11,16)
        assertEdits(await renameAt(doc, 9, 3, "div"), doc, [
            [9, 1, 9, 15],
            [11, 2, 11, 16]
        ])
    })

    it("void tag rename produces only one edit", async function () {
        const doc = await openFixture("rename", "tag-structure.qk")
        assertEdits(await renameAt(doc, 10, 7, "select"), doc, [[10, 5, 10, 10]])
    })

    it("rename not offered at non-tag positions (negative matrix)", async function () {
        const doc = await openFixture("rename", "tag-structure.qk")
        const positions = [
            [0, 0],
            [5, 10],
            [6, 11],
            [6, 12],
            [6, 15],
            [7, 11],
            [8, 0],
            [8, 1],
            [8, 7],
            [1, 3],
            [2, 5],
            [4, 3]
        ]
        for (const [line, ch] of positions) {
            await nodeAssert.rejects(
                renameAt(doc, line, ch, "x"),
                /can't be renamed|无法重命名/,
                `(${line},${ch}) should reject rename`
            )
        }
    })
})
