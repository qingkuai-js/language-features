const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, posOf, eventually } = require("../utils/helpers")

describe("navigation/style-src", function () {
    it("src attribute value definition jumps to style file", async function () {
        const doc = await openFixture("navigation", "style-src.qk")

        // 冷启动下定义链路渐进可用，轮询直到指向目标文件
        await eventually(
            async () => {
                const defs = await vscode.commands.executeCommand(
                    "vscode.executeDefinitionProvider",
                    doc.uri,
                    posOf(doc, 'src="./style.less"', 1, -2) // 落在路径字符串内
                )
                const locs = defs ? (Array.isArray(defs) ? defs : [defs]) : []
                nodeAssert.ok(
                    locs.some(l => (l.uri || l.targetUri).fsPath.endsWith("style.less")),
                    `src definition should point to style.less, got: ${JSON.stringify(
                        locs.map(l => (l.uri || l.targetUri).fsPath)
                    )}`
                )
            },
            { message: "src definition jump timed out" }
        )
    })
})
