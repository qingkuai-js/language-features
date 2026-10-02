const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { writeFixture, typeText, eventually } = require("../utils/helpers")

let seq = 0

async function typeGt(prefix) {
    const doc = await writeFixture(["snippet", `ac-${prefix.replace(/[^a-z]/gi, "_")}.qk`], prefix)
    const editor = await vscode.window.showTextDocument(doc)
    const pos = doc.positionAt(doc.getText().length)
    editor.selection = new vscode.Selection(pos, pos)
    await typeText(">")
    await vscode.commands.executeCommand("editor.action.triggerSuggest")
    return doc
}

describe("snippet/auto-close", function () {
    it("html tag typing > auto-completes closing tag", async function () {
        const doc = await typeGt("<div")
        await eventually(
            () => {
                nodeAssert.ok(
                    /<\/div>\s*$/.test(doc.getText()),
                    `got: ${JSON.stringify(doc.getText())}`
                )
                return true
            },
            { deadline: 5000, interval: 150, message: "</div not written back" }
        )
    })

    it("component tag typing > auto-completes closing tag", async function () {
        const doc = await typeGt("<Component")
        await eventually(
            () => {
                nodeAssert.ok(
                    /<\/Component>\s*$/.test(doc.getText()),
                    `got: ${JSON.stringify(doc.getText())}`
                )
                return true
            },
            { deadline: 5000, interval: 150, message: "</Component> not written back" }
        )
    })

    it("void tag typing > does not auto-close", async function () {
        const doc = await typeGt("<input")
        await new Promise(r => setTimeout(r, 1500))
        nodeAssert.strictEqual(
            doc.getText(),
            "<input>",
            "typing > after input should not produce a closing tag"
        )
    })

    /** 键入 </ 两个字符（先 < 后 /）。/ 是注册的补全触发字符，键入即自动触发，
     *  勿手动 triggerSuggest（两次请求各回写一次片段导致重复插入） */
    async function typeCloseTag(prefix) {
        const doc = await writeFixture(["snippet", `cl-${seq++}.qk`], prefix)
        const editor = await vscode.window.showTextDocument(doc)
        const pos = doc.positionAt(doc.getText().length)
        editor.selection = new vscode.Selection(pos, pos)
        await typeText("<")
        await typeText("/")
        return doc
    }

    it("typing </ auto-completes nearest unclosed parent tag (nested html)", async function () {
        const doc = await typeCloseTag("<div><span>")
        await eventually(
            () => {
                nodeAssert.ok(
                    /<\/span>\s*$/.test(doc.getText()),
                    `expected </span> to be written back, got: ${JSON.stringify(doc.getText())}`
                )
                return true
            },
            { deadline: 5000, interval: 150, message: "</span not written back" }
        )
    })

    it("typing </ auto-completes nearest unclosed parent tag (component tag)", async function () {
        const doc = await typeCloseTag("<Component>")
        await eventually(
            () => {
                nodeAssert.ok(
                    /<\/Component>\s*$/.test(doc.getText()),
                    `expected </Component> to be written back, got: ${JSON.stringify(doc.getText())}`
                )
                return true
            },
            { deadline: 5000, interval: 150, message: "</Component not written back" }
        )
    })
})
