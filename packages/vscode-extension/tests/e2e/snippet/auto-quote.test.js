const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { writeFixture, typeText, eventually } = require("../utils/helpers")

let seq = 0
async function typeEquals(prefix, waitFor) {
    const doc = await writeFixture(["snippet", `auto-quote-${seq++}.qk`], prefix)
    const editor = await vscode.window.showTextDocument(doc)
    const pos = doc.positionAt(doc.getText().length)
    editor.selection = new vscode.Selection(pos, pos)
    await typeText("=")
    await vscode.commands.executeCommand("editor.action.triggerSuggest")
    await eventually(
        () => {
            nodeAssert.ok(
                doc.getText().includes(waitFor),
                `not written back, got: ${JSON.stringify(doc.getText())}`
            )
            return true
        },
        {
            interval: 150,
            deadline: 5000,
            message: `${prefix}: write-back timed out after typing =`
        }
    )
    return doc.getText()
}

describe("snippet/auto-quote", function () {
    it("static attribute = auto-fills double quotes", async function () {
        await typeEquals("<div class", 'class=""')
    })

    it("directive/dynamic/event/reference attributes = auto-fill curly braces", async function () {
        await typeEquals("<div #for", "#for={")
        await typeEquals("<div !class", "!class={")
        await typeEquals("<div @click", "@click={")
        await typeEquals("<input &value", "&value={")
    })
})
