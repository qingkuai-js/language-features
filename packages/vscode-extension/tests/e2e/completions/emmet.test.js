const nodeAssert = require("node:assert")

const { openFixture, labelOf, pollItems } = require("../utils/helpers")

const LANG_TAGS = [
    "lang-css",
    "lang-js",
    "lang-less",
    "lang-postcss",
    "lang-sass",
    "lang-scss",
    "lang-stylus",
    "lang-ts"
]

function isEmmet(i) {
    return (i.detail || "").includes("Emmet")
}

/** fixture 规范为单换行结尾；顶层缩写补全位置须取最后一个内容行行尾（文档末尾的空行提取不到缩写） */
function endOfContent(doc) {
    return doc.getText().replace(/\n+$/, "").length
}

describe("completions/emmet", function () {
    it("top-level abbreviations in template context suggest 8 embedded language tags and emmet expansions", async function () {
        const doc = await openFixture("completions", "emmet-top.qk")
        const items = await pollItems(
            doc,
            endOfContent(doc),
            list => list.some(i => labelOf(i) === "lang-ts") && list.some(isEmmet)
        )
        const missing = LANG_TAGS.filter(t => !items.some(i => labelOf(i) === t))
        nodeAssert.deepStrictEqual(
            missing,
            [],
            `missing lang tags: ${missing}, got list: ${JSON.stringify(items.map(labelOf))}`
        )
        nodeAssert.ok(items.some(isEmmet), "an Emmet expansion item should exist")
    })

    it("complex abbreviations suggest lang tags and multiple emmet expansions @known-bug", async function () {
        const doc = await openFixture("completions", "emmet-complex.qk")

        // 【已确认 BUG】(2026-10-02 用户裁决)：复杂缩写处仅提供 emmet 展开项、
        // 丢失全部 lang-* 标签——修复后本测试应转绿
        const items = await pollItems(
            doc,
            endOfContent(doc),
            list =>
                list.filter(isEmmet).length >= 4 &&
                LANG_TAGS.every(t => list.some(i => labelOf(i) === t))
        )
        const missing = LANG_TAGS.filter(t => !items.some(i => labelOf(i) === t))
        nodeAssert.deepStrictEqual(missing, [], `missing lang tags: ${missing}`)
        nodeAssert.ok(
            items.filter(isEmmet).length >= 4,
            "complex abbreviations should provide ≥4 emmet expansion items"
        )
    })

    it("emmet available in tag text content (single item)", async function () {
        let doc = await openFixture("completions", "emmet-text-1.qk")
        let items = await pollItems(doc, 8, list => list.length === 1 && isEmmet(list[0]))
        nodeAssert.strictEqual(
            items.length,
            1,
            `text content should have only 1 emmet item, got ${items.length}`
        )
        nodeAssert.ok(isEmmet(items[0]))

        doc = await openFixture("completions", "emmet-text-2.qk")
        items = await pollItems(doc, doc.getText().indexOf("span") + 4, list => list.length === 1)
        nodeAssert.strictEqual(items.length, 1)
        nodeAssert.ok(isEmmet(items[0]))
    })

    it("inline text positions provide an emmet expansion group", async function () {
        const doc = await openFixture("completions", "emmet-text-3.qk")
        const items = await pollItems(
            doc,
            doc.getText().indexOf("</i>a") + 5,
            list => list.length >= 8 && list.every(isEmmet)
        )
        nodeAssert.ok(
            items.length >= 8 && items.every(isEmmet),
            `inline text positions should provide ≥8 pure emmet items, got: ${JSON.stringify(items.map(labelOf))}`
        )
    })

    it("emmet expansions on dynamic/reference attributes, directives, and events keep the full attribute structure", async function () {
        const doc = await openFixture("completions", "emmet-special.qk")
        const lines = doc.getText().split("\n")
        const cases = [
            [0, "<div !class={expression}>|</div>"],
            [1, "<input &value={inpValue}>"],
            [2, "<div #for={item, index of arr}>|</div>"],
            [3, "<span !class={|} &value={|} #for={|} @keyup|stop|once={|}>|</span>"],
            [4, "<div @click={()=>{console.log(expression)}}>|</div>"]
        ]
        for (const [line, expectDoc] of cases) {
            // 各用例在缩写行行尾触发（emmet 从当前行到光标提取缩写；坐标若超行尾
            // 会被换算到下一行行首，当前行为空则提取不到缩写）
            const ch = lines[line].length
            const offset = lines.slice(0, line).join("\n").length + (line ? 1 : 0) + ch
            const items = await pollItems(doc, offset, list =>
                list.some(i => String(i.documentation || "").includes(expectDoc))
            )
            const hit = items.find(i => String(i.documentation || "").includes(expectDoc))
            nodeAssert.ok(
                hit,
                `end of line ${line} should have an emmet item whose documentation contains ${JSON.stringify(expectDoc)}, ` +
                    `got documentation of first 3 items: ${JSON.stringify(items.slice(0, 3).map(i => i.documentation))}`
            )
        }
    })
})
