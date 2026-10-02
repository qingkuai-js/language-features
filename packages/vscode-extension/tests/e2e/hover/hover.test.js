const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually } = require("../utils/helpers")

async function hoverAt(doc, line, character, filter, wait = true) {
    // 正例：轮询等待 hover 就绪（编译延迟），负例：单次采样
    const request = () =>
        vscode.commands.executeCommand(
            "vscode.executeHoverProvider",
            doc.uri,
            new vscode.Position(line, character)
        )
    let hovers = wait
        ? await eventually(async () => {
              const list = await request()
              const filtered = list && list.length && filter ? list.filter(filter) : list
              nodeAssert.ok(filtered && filtered.length, "hover not ready")
              return filtered
          })
        : await request()
    if (!hovers || !hovers.length) return null

    // 多 provider 聚合时跳过空白内容项
    const list = hovers.filter(
        h =>
            h.contents &&
            h.contents.length &&
            String(
                typeof h.contents[0] === "string" ? h.contents[0] : h.contents[0].value || ""
            ).trim()
    )
    if (!list.length) return null

    const h = list[0]
    const content = h.contents[0]
    return {
        range: h.range,
        value: typeof content === "string" ? content : content.value
    }
}

/** 取 hover 首段内容的文本（string 或 MarkdownContent 形态兼容） */
function valueOf(h) {
    const c = h.contents && h.contents[0]
    return typeof c === "string" ? c : (c && c.value) || ""
}

function assertRange(range, sl, sc, el, ec) {
    nodeAssert.ok(
        range &&
            range.start.line === sl &&
            range.start.character === sc &&
            range.end.line === el &&
            range.end.character === ec,
        `range should be (${sl},${sc})-(${el},${ec}), got: ${JSON.stringify(range)}`
    )
}

describe("hover/tips", function () {
    it("tag hover: positive matrix for open/close tags and lang tags", async function () {
        const doc = await openFixture("hover", "tag-matrix.qk")
        for (let c = 1; c < 4; c++) {
            const ret = await hoverAt(doc, 0, c, h => /The div/.test(valueOf(h)))
            assertRange(ret && ret.range, 0, 1, 0, 4)
            nodeAssert.match(ret.value.trim(), /^The div/)
        }

        const p1 = await hoverAt(doc, 1, 5)
        assertRange(p1.range, 1, 5, 1, 6)
        nodeAssert.match(p1.value, /^The p/)

        for (let c = 9; c < 14; c++) {
            const ret = await hoverAt(doc, 2, c)
            assertRange(ret.range, 2, 9, 2, 14)
            nodeAssert.match(ret.value.trim(), /^The input/)
        }

        const p2 = await hoverAt(doc, 3, 6)
        assertRange(p2.range, 3, 6, 3, 7)
        nodeAssert.match(p2.value, /^The p/)

        for (let c = 2; c < 5; c++) {
            const ret = await hoverAt(doc, 4, c)
            assertRange(ret.range, 4, 2, 4, 5)
            nodeAssert.match(ret.value.trim(), /^The div/)
        }
        for (let c = 1; c < 8; c++) {
            const ret = await hoverAt(doc, 5, c)
            assertRange(ret.range, 5, 1, 5, 8)
            nodeAssert.match(ret.value.trim(), /^The lang-js/)
        }
        for (let c = 11; c < 18; c++) {
            const ret = await hoverAt(doc, 5, c)
            assertRange(ret.range, 5, 11, 5, 18)
            nodeAssert.match(ret.value.trim(), /^The lang-js/)
        }
    })

    it("tag hover negative: non-tag-name positions return empty", async function () {
        const doc = await openFixture("hover", "tag-matrix-neg.qk")
        const positions = [
            [0, 0],
            [0, 4],
            [0, 5],
            [1, 4],
            [1, 6],
            [1, 7],
            [2, 7],
            [2, 8],
            [2, 14],
            [2, 15],
            [2, 16],
            [3, 3],
            [3, 4],
            [3, 5],
            [3, 7],
            [3, 8],
            [4, 0],
            [4, 1],
            [4, 5],
            [4, 6],
            [5, 0],
            [5, 8],
            [5, 9],
            [5, 10],
            [5, 18],
            [5, 19]
        ]
        for (const [line, ch] of positions) {
            const ret = await hoverAt(doc, line, ch, undefined, false)
            nodeAssert.strictEqual(ret, null, `(${line},${ch}) should have no tag hover`)
        }
    })

    it("attribute hover: static/dynamic/event/boolean positive cases", async function () {
        const doc = await openFixture("hover", "attribute-matrix.qk")
        for (let c = 4; c < 9; c++) {
            const ret = await hoverAt(doc, 1, c)
            assertRange(ret.range, 1, 4, 1, 9)
            nodeAssert.match(ret.value.trim(), /^A space-separated/)
        }
        for (let c = 4; c < 10; c++) {
            const ret = await hoverAt(doc, 2, c)
            assertRange(ret.range, 2, 4, 2, 10)
            nodeAssert.match(ret.value.trim(), /^A space-separated/)
        }
        for (let c = 4; c < 10; c++) {
            const ret = await hoverAt(doc, 3, c)
            assertRange(ret.range, 3, 4, 3, 10)
            nodeAssert.match(ret.value.trim(), /^A pointing/)
        }
        for (let c = 8; c < 14; c++) {
            const ret = await hoverAt(doc, 5, c)
            assertRange(ret.range, 5, 8, 5, 14)
            nodeAssert.match(ret.value.trim(), /^A Boolean/)
        }
    })

    it("attribute hover negative: positions outside attribute names return empty", async function () {
        const doc = await openFixture("hover", "attribute-matrix-neg.qk")
        const positions = [
            [1, 3],
            [1, 9],
            [1, 10],
            [2, 3],
            [2, 10],
            [2, 11],
            [3, 3],
            [3, 10],
            [3, 11],
            [5, 7],
            [5, 14],
            [5, 15]
        ]
        for (const [line, ch] of positions) {
            const ret = await hoverAt(doc, line, ch, undefined, false)
            nodeAssert.strictEqual(ret, null, `(${line},${ch}) should have no attribute hover`)
        }
    })

    it("event and event modifier hover contents precisely distinguished, separator positions empty", async function () {
        const doc = await openFixture("hover", "event-modifier.qk")
        for (let c = 5; c < 11; c++) {
            const ret = await hoverAt(doc, 0, c)
            nodeAssert.match(ret.value.trim(), /^A pointing device/)
        }
        for (let c = 12; c < 16; c++) {
            const ret = await hoverAt(doc, 0, c)
            nodeAssert.match(ret.value.trim(), /^If the \[once\]/)
        }
        for (let c = 17; c < 24; c++) {
            const ret = await hoverAt(doc, 0, c)
            nodeAssert.match(ret.value.trim(), /^If the \[capture\]/)
        }
        for (let c = 11; c < 17; c++) {
            const ret = await hoverAt(doc, 1, c)
            nodeAssert.strictEqual(ret.value, "A key is released.")
        }
        for (let c = 18; c < 23; c++) {
            const ret = await hoverAt(doc, 1, c)
            nodeAssert.match(ret.value, /The \[enter\]\(https:[^)]+\) event (flag|modifier)/)
        }
        for (const [line, ch] of [
            [0, 4],
            [0, 11],
            [0, 16],
            [1, 10],
            [1, 17]
        ]) {
            const ret = await hoverAt(doc, line, ch, undefined, false)
            nodeAssert.strictEqual(ret, null, `(${line},${ch}) should have no hover at separator`)
        }
    })

    it("character entity hover: positive and negative cases", async function () {
        const doc = await openFixture("hover", "character-entity.qk")
        const expectEntity = async (line, ch, sl, sc, el, ec, ch0) => {
            const ret = await hoverAt(doc, line, ch)
            assertRange(ret.range, sl, sc, el, ec)
            nodeAssert.match(ret.value, new RegExp("^Character entity representing: " + ch0))
        }
        for (let c = 0; c < 3; c++) await expectEntity(0, c, 0, 0, 0, 3, "<")
        for (let c = 3; c < 6; c++) await expectEntity(0, c, 0, 3, 0, 6, ">")
        for (let c = 4; c < 10; c++) await expectEntity(1, c, 1, 4, 1, 10, '"')
        for (let c = 6; c < 11; c++) await expectEntity(2, c, 2, 6, 2, 11, "&")

        for (const [line, ch] of [
            [0, 6],
            [1, 3],
            [2, 5]
        ]) {
            const ret = await hoverAt(doc, line, ch, undefined, false)
            nodeAssert.strictEqual(ret, null, `(${line},${ch}) should have no entity hover`)
        }
    })
})
