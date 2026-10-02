const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually, posOf, firstHoverValue, labelOf } = require("../utils/helpers")

describe("hover/builtin-methods", function () {
    it("setContext hover shows built-in docs", async function () {
        const doc = await openFixture("hover", "builtin-set-context.qk")

        // 悬停在 setContext 标识符内部（charShift 从 search 末尾起算）
        const pos = posOf(doc, "setContext", 1, -3)
        await eventually(
            async () => {
                const value = await firstHoverValue(doc, pos)
                nodeAssert.match(
                    value,
                    /Writes a context value into the current component's contexts layer/,
                    `setContext hover should include built-in docs, got: ${JSON.stringify(value.slice(0, 120))}`
                )
                return value
            },
            { message: "setContext hover did not show built-in docs" }
        )
    })

    it("defaults hover shows built-in docs", async function () {
        const doc = await openFixture("hover", "builtin-defaults.qk")
        const pos = posOf(doc, "defaults", 1, -3)
        await eventually(
            async () => {
                const value = await firstHoverValue(doc, pos)

                // 补全列表中已存在 defaults 符号（来源与 setContext 系不同），其 hover 需含内置文档
                nodeAssert.match(
                    value,
                    /Defines fallback values for optional component bindings/,
                    `defaults hover should include built-in docs, got: ${JSON.stringify(value.slice(0, 120))}`
                )
                return value
            },
            { message: "defaults hover did not show built-in docs" }
        )
    })

    it("in-script identifier completion provides built-in method names", async function () {
        const doc = await openFixture("hover", "builtin-completion.qk")
        const pos = posOf(doc, "setC")
        await eventually(
            async () => {
                const list = await vscode.commands.executeCommand(
                    "vscode.executeCompletionItemProvider",
                    doc.uri,
                    pos
                )
                const labels = (list ? list.items : []).map(labelOf)
                nodeAssert.ok(
                    ["setContext", "setContextGetter", "setContextExp"].every(n =>
                        labels.includes(n)
                    ),
                    `completion should provide the setContext family, got: ${JSON.stringify(labels)}`
                )
                return labels
            },
            { message: "built-in method completion did not appear" }
        )
    })

    it("provides signature help after setContext call opening paren", async function () {
        const doc = await openFixture("hover", "builtin-signature.qk")

        // 位置在 "(" 之后、括号内侧（charShift 0）；光标落在 "(" 字符上时签名帮助
        // 不触发（普通 ts 同形对照亦然）——2026-10-06 探针定案，非功能缺失
        const pos = posOf(doc, "setContext(", 1, 0)
        await eventually(
            async () => {
                const help = await vscode.commands.executeCommand(
                    "vscode.executeSignatureHelpProvider",
                    doc.uri,
                    pos,
                    "("
                )
                nodeAssert.ok(
                    help && help.signatures && help.signatures.length > 0,
                    "setContext( should provide signature help"
                )
                return help
            },
            { message: "built-in method signature help did not appear" }
        )
    })
})
