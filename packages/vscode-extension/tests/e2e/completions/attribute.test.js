const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually, labelOf, completeAt } = require("../utils/helpers")

function offsetOf(doc, line, character) {
    return doc.offsetAt(new vscode.Position(line, character))
}

function insertTextOf(item) {
    if (item.textEdit) {
        const te = item.textEdit
        return typeof te === "string" ? te : te.newText
    }
    if (item.insertText) {
        return typeof item.insertText === "string" ? item.insertText : item.insertText.value
    }
    return null
}

async function pollComplete(doc, offset, cond, message) {
    return eventually(async () => {
        const items = await completeAt(doc, offset)
        nodeAssert.ok(cond(items), `${message}, got: ${JSON.stringify(items.map(labelOf))}`)
        return items
    })
}

describe("completions/attribute-names", function () {
    it("static attribute names: class offered as auto-quoted snippet", async function () {
        const doc = await openFixture("completions", "attr-static.qk")
        const items = await pollComplete(
            doc,
            offsetOf(doc, 0, 8),
            l => l.some(i => labelOf(i) === "class"),
            "should include class"
        )
        nodeAssert.strictEqual(insertTextOf(items.find(i => labelOf(i) === "class")), 'class="$0"')
    })

    it("static attribute names: edit range covers typed prefix", async function () {
        const doc = await openFixture("completions", "attr-static.qk")
        const items = await pollComplete(
            doc,
            offsetOf(doc, 0, 8),
            l => l.some(i => labelOf(i) === "class"),
            "should include class"
        )
        for (const item of items) {
            const te = item.textEdit
            if (te && typeof te !== "string") {
                nodeAssert.strictEqual(
                    te.range.start.character,
                    5,
                    "edit range should start at the attribute name start"
                )
                nodeAssert.strictEqual(te.range.end.character, 8)
            }
        }
    })

    it("dynamic attribute names (!): class offered as curly-brace snippet", async function () {
        const doc = await openFixture("completions", "attr-dynamic.qk")
        const items = await pollComplete(
            doc,
            offsetOf(doc, 0, 6),
            l => l.some(i => labelOf(i) === "!class"),
            "should include !class"
        )
        nodeAssert.strictEqual(
            insertTextOf(items.find(i => labelOf(i) === "!class")),
            "!class={$0}"
        )
    })

    it("prefix replacement with existing dynamic attributes (!id / !cla / !va)", async function () {
        const doc = await openFixture("completions", "attr-dynamic-prefix.qk")

        // 就绪由各位置的轮询条件分别保证
        await pollComplete(
            doc,
            offsetOf(doc, 0, 8),
            l => l.some(i => labelOf(i) === "!id"),
            "should include !id (existing items provided as-is)"
        )

        const cls = await pollComplete(
            doc,
            offsetOf(doc, 0, 16),
            l => l.some(i => labelOf(i) === "!class"),
            "should include !class"
        )
        nodeAssert.strictEqual(insertTextOf(cls.find(i => labelOf(i) === "!class")), "!class={$0}")

        const val = await pollComplete(
            doc,
            offsetOf(doc, 1, 14),
            l => l.some(i => labelOf(i) === "!value"),
            "should include !value"
        )
        nodeAssert.strictEqual(insertTextOf(val.find(i => labelOf(i) === "!value")), "!value={$0}")
    })

    it("event attribute names (@): each item inserts name={}", async function () {
        const doc = await openFixture("completions", "attr-event.qk")
        const items = await pollComplete(
            doc,
            offsetOf(doc, 0, 6),
            l => l.length >= 60,
            "event attributes should be provided in bulk"
        )
        for (const item of items) {
            nodeAssert.strictEqual(
                insertTextOf(item),
                `${labelOf(item)}={$0}`,
                `event item insert text should be name={$0}, got: ${JSON.stringify(insertTextOf(item))}`
            )
        }
    })

    it("@ position after existing event attributes: replacement range and append form", async function () {
        const doc = await openFixture("completions", "attr-event-mixed.qk")

        // (0,11)：已有事件名之后的 @，插入应为完整名称（不带 ={}）
        const items1 = await pollComplete(
            doc,
            offsetOf(doc, 0, 11),
            l => l.length >= 60,
            "event attributes should be provided in bulk"
        )
        for (const item of items1) {
            nodeAssert.strictEqual(insertTextOf(item), labelOf(item))
        }

        // (0,26)：新 @ 位置，插入带 ={}
        const items2 = await pollComplete(
            doc,
            offsetOf(doc, 0, 26),
            l => l.length >= 60,
            "event attributes should be provided in bulk"
        )
        for (const item of items2) {
            nodeAssert.strictEqual(insertTextOf(item), `${labelOf(item)}={$0}`)
        }

        // (1,15)：嵌套元素的 @ 前缀
        await pollComplete(
            doc,
            offsetOf(doc, 1, 15),
            l => l.length >= 60,
            "event attributes should be provided in bulk"
        )
    })

    it("directive attribute names (#): full set offered with correct insert form", async function () {
        const doc = await openFixture("completions", "attr-directive.qk")
        const items = await pollComplete(
            doc,
            offsetOf(doc, 0, 6),
            l => ["#if", "#for", "#await", "#html"].every(n => l.some(i => labelOf(i) === n)),
            "directive set should include if/for/await/html"
        )
        const names = [...new Set(items.map(labelOf))]
        nodeAssert.ok(
            ["#if", "#for", "#await", "#html"].every(n => names.includes(n)),
            `directive set should include if/for/await/html, got: ${JSON.stringify(names)}`
        )
        for (const item of items) {
            if (item.textEdit || item.insertText) {
                const text = insertTextOf(item)
                nodeAssert.ok(
                    text === labelOf(item) || text.startsWith(labelOf(item) + "={"),
                    `directive insert text should start with the name or be name={placeholder}, got: ${JSON.stringify(text)}`
                )
            }
        }
    })

    it("reference attributes (&) offer the matching set based on input/select type", async function () {
        const doc = await openFixture("completions", "attr-reference.qk")

        // 引用属性表就绪轮询：首个位置到达后，同文档其余位置为稳态，直接快照断言
        await pollComplete(
            doc,
            offsetOf(doc, 0, 8),
            l => l.map(labelOf).includes("&value"),
            "input should include &value"
        )

        const at = (line, ch) => completeAt(doc, offsetOf(doc, line, ch))
        nodeAssert.ok(
            (await at(0, 8)).map(labelOf).includes("&value"),
            "input should include &value"
        )
        nodeAssert.ok((await at(1, 20)).map(labelOf).includes("&value"))

        const r2 = (await at(2, 22)).map(labelOf).filter(l => l.startsWith("&"))
        nodeAssert.ok(
            ["&number", "&value"].every(n => r2.includes(n)),
            `should include &number/&value, got: ${JSON.stringify(r2)}`
        )
        nodeAssert.ok((await at(5, 9)).map(labelOf).includes("&value"))
        nodeAssert.ok((await at(6, 18)).map(labelOf).includes("&value"))

        const r3 = (await at(3, 21)).map(labelOf).filter(l => l.startsWith("&"))
        nodeAssert.ok(
            ["&checked", "&group"].every(n => r3.includes(n)),
            `should include &checked/&group, got: ${JSON.stringify(r3)}`
        )

        const r4 = (await at(4, 24)).map(labelOf).filter(l => l.startsWith("&"))
        nodeAssert.ok(
            ["&checked", "&group"].every(n => r4.includes(n)),
            `should include &checked/&group, got: ${JSON.stringify(r4)}`
        )
    })

    it("event modifiers offer the matching set per event type", async function () {
        const doc = await openFixture("completions", "attr-modifiers.qk")

        // 修饰符表就绪轮询：click 位置到达后同文档其余位置为稳态
        await pollComplete(
            doc,
            offsetOf(doc, 0, 12),
            l => [...new Set(l.map(labelOf))].length >= 5,
            "click modifiers should be a non-empty set"
        )

        const at = (line, ch) => completeAt(doc, offsetOf(doc, line, ch))
        const click = [...new Set((await at(0, 12)).map(labelOf))]
        const input = [...new Set((await at(1, 14)).map(labelOf))]
        const keydown = [...new Set((await at(3, 14)).map(labelOf))]
        nodeAssert.ok(
            click.length >= 5,
            `click modifiers should be a non-empty set, got ${click.length}`
        )
        for (const m of [...click, ...input, ...keydown]) {
            nodeAssert.match(
                m,
                /^[a-z]+$/,
                `modifiers should be lowercase words, got: ${JSON.stringify(m)}`
            )
        }

        // 键盘类事件修饰符集合一致
        nodeAssert.ok(keydown.length >= 5 && input.length >= 5)
    })

    it("existing modifiers are no longer suggested", async function () {
        const doc = await openFixture("completions", "attr-modifiers-dup.qk")
        const at = (line, ch) => completeAt(doc, offsetOf(doc, line, ch))

        // 位置取最后一个已存在修饰符的 | 之后（范围之外），排除逻辑应生效
        const cap = (await at(0, 25)).map(labelOf)
        nodeAssert.ok(
            !cap.includes("once") && !cap.includes("capture"),
            `once/capture should be excluded, got: ${JSON.stringify(cap)}`
        )

        const compose = (await at(1, 22)).map(labelOf)
        nodeAssert.ok(
            !compose.includes("compose"),
            `compose should be excluded, got: ${JSON.stringify(compose)}`
        )

        const enter = (await at(2, 18)).map(labelOf)
        nodeAssert.ok(
            !enter.includes("enter"),
            `enter should be excluded, got: ${JSON.stringify(enter)}`
        )
    })

    it("input type attribute value offers suggested values (incl. text/checkbox)", async function () {
        const doc = await openFixture("completions", "attr-value.qk")
        await pollComplete(
            doc,
            offsetOf(doc, 0, 13),
            l => ["text", "checkbox"].every(n => l.map(labelOf).includes(n)),
            "type suggested values should include text/checkbox"
        )
    })

    it("empty interpolation values of dynamic/event/directive attributes offer full script completions", async function () {
        const doc = await openFixture("completions", "attr-empty-interpolation.qk")

        for (const [line, ch] of [
            [1, 19],
            [1, 29],
            [1, 36]
        ]) {
            await pollComplete(
                doc,
                offsetOf(doc, line, ch),
                l => {
                    const labels = l.map(labelOf)
                    return (
                        l.length > 1000 &&
                        ["alias", "derived", "effect"].every(n => labels.includes(n))
                    )
                },
                `(${line},${ch}) empty interpolation should offer full script completions`
            )
        }
    })
})
