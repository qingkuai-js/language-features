const nodeAssert = require("node:assert")
const { checkTokens } = require("./_lib/balloon")
const { getTokenizer } = require("./_lib/loader")
const { KITCHEN_SINK } = require("./_lib/fixtures")

const PERF_BUDGET_MS = 5000

describe("grammar/edge cases", function () {
    let tokenize
    let markdownTokenize
    let qkeTokenize
    before(async function () {
        tokenize = await getTokenizer("source.qk")
        markdownTokenize = await getTokenizer("text.html.markdown")
        qkeTokenize = await getTokenizer("source.qke")
    })

    it("tokenizes an empty document without throwing", function () {
        const doc = tokenize("")
        nodeAssert.strictEqual(doc.length, 1)
        nodeAssert.ok(Array.isArray(doc[0].tokens))
    })

    it("handles CRLF line endings", function () {
        const doc = tokenize("<div>\r\n<p>x</p>\r\n</div>\r\n")
        nodeAssert.strictEqual(doc.length, 4)
        nodeAssert.ok(
            doc.every(l => !l.text.includes("\r")),
            "line content should not contain carriage returns"
        )
        nodeAssert.ok(
            doc[1].tokens.some(t => t.scopes.includes("meta.tag.normal.p.start.qk")),
            "expected a normal p tag inside CRLF document"
        )
    })

    it("treats a byte order mark as a leading text token", function () {
        const doc = tokenize("\uFEFF<div>x</div>\n")
        const first = doc[0].tokens[0]
        nodeAssert.strictEqual(first.startIndex, 0)
        nodeAssert.strictEqual(first.endIndex, 1)
    })

    it("keeps UTF-16 offsets stable for astral-plane characters", function () {
        // 国旗 emoji 占 4 个 UTF-16 码元，token 索引必须仍是 UTF-16 偏移
        checkTokens(
            tokenize,
            `
                <div title="🎉🇨🇳">x</div>
                            ^^^^^^ string.quoted.double.qk
                                    ^ text
            `
        )
    })

    it("does not treat interpolations inside comments as code", function () {
        checkTokens(
            tokenize,
            `
                <!-- {count} -->
                    ^^^^^^^^^ comment.block.qk
            `
        )
    })

    it("does not throw on malformed markup", function () {
        for (const text of [
            "<>",
            "</>",
            "< div>",
            "</div attr>",
            '<div class="a"',
            "<!-- unclosed",
            "<p>{unclosed",
            "<div>".repeat(50)
        ]) {
            const doc = tokenize(text + "\n")
            nodeAssert.ok(doc.length >= 1, `expected lines for ${JSON.stringify(text)}`)
        }
    })

    it("tokenizes deterministically", function () {
        const a = JSON.stringify(tokenize(KITCHEN_SINK))
        const b = JSON.stringify(tokenize(KITCHEN_SINK))
        nodeAssert.strictEqual(a, b, "two runs over the same document must agree")
    })

    it("keeps large realistic documents well under the perf budget", function () {
        const lines = []
        for (let i = 0; i < 2000; i++) {
            lines.push(
                `<div class="row ${i % 7}" #if={show${i}} @click|stop={open(${i})}>`,
                `  <span>{items[${i}].name} &amp; text ${i}</span>`,
                `  <!-- row ${i} -->`,
                `</div>`
            )
        }
        const text = lines.join("\n")
        const t0 = Date.now()
        const doc = tokenize(text)
        const elapsed = Date.now() - t0
        nodeAssert.strictEqual(doc.length, 8000)
        nodeAssert.ok(
            elapsed < PERF_BUDGET_MS,
            `tokenizing 8000 lines took ${elapsed}ms, budget ${PERF_BUDGET_MS}ms`
        )
    })

    it("keeps pathological single-line input bounded", function () {
        const cases = [
            "<div " + 'class="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" '.repeat(3000),
            "<!-- " + "padding text ".repeat(9000),
            "<p>" + "&notanentity; ".repeat(4000) + "</p>",
            "<p>{ " + "a + ".repeat(12000) + "b",
            "<div>".repeat(3000) + "</div>".repeat(3000)
        ]
        for (const text of cases) {
            const t0 = Date.now()
            tokenize(text)
            const elapsed = Date.now() - t0
            nodeAssert.ok(
                elapsed < PERF_BUDGET_MS,
                `pathological input (${text.length} chars) took ${elapsed}ms`
            )
        }
    })

    it("injects qingkuai into qingkuai code fences in markdown", function () {
        checkTokens(
            markdownTokenize,
            `
                \`\`\`qingkuai
                ^^^ punctuation.definition.markdown
                <div>{count}</div>
                ^ punctuation.definition.tag.begin.qk
                     ^ source.tsx.embedded.qingkuai
                      ^^^^^ meta.embedded.block.qk
            `
        )
    })

    it("tokenizes qingkuai-emmet abbreviations with embedded expressions", function () {
        checkTokens(
            qkeTokenize,
            `
                div>span{a+b}
                ^^^^^^^^ text
                        ^ meta.template.expression.qk
                         ^ meta.embedded.block.qk source.ts
            `
        )
    })
})
