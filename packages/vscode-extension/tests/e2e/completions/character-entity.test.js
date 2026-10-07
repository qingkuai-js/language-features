const nodeAssert = require("node:assert")

const { openFixture, labelOf, pollItems } = require("../utils/helpers")

/** 功能断言：全量实体、插入文本以 & 开头、编辑起点正确 */
function assertEntityFunction(items, expectStartLine, expectStartChar) {
    items = items.filter(i => labelOf(i).startsWith("&"))
    nodeAssert.ok(
        items.length > 2000,
        `entities should be the full set (>2000), got ${items.length}`
    )
    for (const item of items) {
        const te = item.textEdit
        const text = te
            ? typeof te === "string"
                ? te
                : te.newText
            : typeof item.insertText === "string"
              ? item.insertText
              : item.insertText && item.insertText.value
        nodeAssert.ok(
            text && text.startsWith("&"),
            `entity insert text should start with &, got: ${JSON.stringify(text)} (label=${labelOf(item)})`
        )
        if (te && typeof te !== "string") {
            nodeAssert.strictEqual(te.range.start.line, expectStartLine, "entity edit start line")
            nodeAssert.strictEqual(
                te.range.start.character,
                expectStartChar,
                "entity edit start column"
            )
        }
    }
}

/** 轮询直到实体列表就绪（排除组件/标签等非实体项混入的瞬态） */
function pollEntities(doc, offset) {
    return pollItems(
        doc,
        offset,
        l => l.length > 2000 && l.every(i => labelOf(i).startsWith("&")),
        "&"
    )
}

describe("completions/character-entity", function () {
    it("full entity set offered after & replacing the & itself", async function () {
        const doc = await openFixture("completions", "entity-bare.qk")
        const items = await pollEntities(doc, 1)
        assertEntityFunction(items, 0, 0)
        nodeAssert.ok(
            items.map(labelOf).includes("&amp;") && items.map(labelOf).includes("&lt;"),
            "should include common entities"
        )
    })

    it("replaces the whole prefix text at an entity prefix", async function () {
        const doc = await openFixture("completions", "entity-prefix.qk")
        assertEntityFunction(await pollEntities(doc, 8), 0, 1)
    })

    it("prefix after an existing entity replaces its prefix part", async function () {
        const doc = await openFixture("completions", "entity-mixed.qk")
        const line0 = await pollEntities(doc, 2)
        assertEntityFunction(line0, 0, 0)

        const line1 = await pollEntities(doc, doc.getText().indexOf("equals") + 6)
        assertEntityFunction(line1, 1, 3)
    })

    it("entity completions work in any tag text content", async function () {
        const doc = await openFixture("completions", "entity-anywhere.qk")
        const text = doc.getText()
        const at = (needle, shift) => {
            const idx = text.indexOf(needle)
            nodeAssert.notStrictEqual(idx, -1, `${needle} should exist`)
            return idx + needle.length + shift
        }

        // 列表可能混入组件 snippet（如 <Label>），断言实体子集存在且全量
        const assertEntitiesAmong = (items, needle, min = 1) => {
            const entities = items.filter(i => labelOf(i).startsWith("&"))
            nodeAssert.ok(
                entities.length >= min,
                `entity items at ${needle} should be ≥${min}, got ${entities.length} entities among ${items.length} items`
            )
        }
        assertEntitiesAmong(
            await pollItems(doc, at("xxx&am", 0), l => l.length > 2000, "&"),
            "xxx&am",
            2000
        )
        assertEntitiesAmong(
            await pollItems(doc, at("-&lt", 0), l => l.length > 2000, "&"),
            "-&lt",
            2000
        )
    })

    it("entity completions work inside attribute values ([confirmed bug] not triggered by pure typing, manual trigger works - this test locks the manual-trigger behavior)", async function () {
        const doc = await openFixture("completions", "entity-attr.qk")
        const q1 = await pollEntities(doc, doc.getText().indexOf('class="&"') + 8)
        assertEntityFunction(q1, 0, 12)

        const q2 = await pollEntities(doc, doc.getText().indexOf("&quot") + 5)
        assertEntityFunction(q2, 1, 18)
    })
})
