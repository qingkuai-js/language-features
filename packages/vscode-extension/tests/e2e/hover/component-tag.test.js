const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually, posOf, firstHoverValue } = require("../utils/helpers")

describe("hover/component-tag", function () {
    let app

    // 预热屏障：组件标签/属性悬停要经 TS 插件取组件信息（跨文件建程序），冷启动下首个
    // 请求可能远超断言期限；先等标签悬停命中，断言阶段只负责内容正确性
    before(async function () {
        await openFixture("hover", "component-main.qk")
        app = await openFixture("hover", "component-app.qk")

        const pos = posOf(app, "<ComponentMain", 1, -3)
        await eventually(
            async () => {
                const value = await firstHoverValue(app, pos)
                nodeAssert.match(
                    value,
                    /ComponentMain\s+satisfies\s+\S+/,
                    "warmup: component tag hover should be available"
                )
            },
            { deadline: 60000, message: "component tag hover warmup timed out" }
        )
    })

    it("imported component tag hover shows name satisfies type signature", async function () {
        // 悬停在开始标签名 ComponentMain 内部
        const pos = posOf(app, "<ComponentMain", 1, -3)
        await eventually(
            async () => {
                const value = await firstHoverValue(app, pos)
                nodeAssert.match(
                    value,
                    /ComponentMain\s+satisfies\s+\S+/,
                    `component tag hover should be in name satisfies type form, got: ${JSON.stringify(value.slice(0, 160))}`
                )
                return value
            },
            { deadline: 20000, message: "component tag type signature hover did not appear" }
        )
    })

    it("component prop hover shows (property) name: type", async function () {
        // 悬停在属性名 title 内部（! 之后）
        const pos = posOf(app, "!title", 1, -3)
        await eventually(
            async () => {
                const value = await firstHoverValue(app, pos)
                nodeAssert.match(
                    value,
                    /property.*title.*string/s,
                    `component prop hover should be in (property) title: string form, got: ${JSON.stringify(value.slice(0, 160))}`
                )
                return value
            },
            { deadline: 20000, message: "component prop type hover did not appear" }
        )
    })

    it("unknown unimported component tag hover returns empty", async function () {
        const doc = await openFixture("hover", "component-unknown.qk")

        // 负例：单次采样（无编译依赖）
        const pos = posOf(doc, "<UnknownComp", 1, -3)
        const hovers = await vscode.commands.executeCommand(
            "vscode.executeHoverProvider",
            doc.uri,
            pos
        )
        const nonEmpty = (hovers || []).filter(h => {
            const c = h.contents && h.contents[0]
            return (typeof c === "string" ? c : (c && c.value) || "").trim()
        })
        nodeAssert.strictEqual(
            nonEmpty.length,
            0,
            `unknown component tag should have no hover, got: ${JSON.stringify(nonEmpty.map(h => h.contents))}`
        )
    })
})
