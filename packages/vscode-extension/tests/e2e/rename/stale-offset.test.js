const vscode = require("vscode")
const nodeAssert = require("node:assert")
const nodePath = require("node:path")

const { eventually, setDocText } = require("../utils/helpers")
const { raceRequest } = require("../utils/reconcile")

const VERSION_A = "<lang-js>\n    let vAlpha1 = reactive(1)\n</lang-js>\n\n<p>{vAlpha1}</p>\n"
const VERSION_B = "<lang-js>\n    let vBeta1 = reactive(1)\n</lang-js>\n\n<p>{vBeta1}</p>\n"

describe("rename/stale-offset", function () {
    let doc, uri

    async function writeVersion(text) {
        const ws = vscode.workspace.workspaceFolders[0]
        uri = vscode.Uri.file(nodePath.join(ws.uri.fsPath, "rename", "stale-offset.qk"))
        await vscode.workspace.fs.writeFile(uri, Buffer.from(text))
        if (!doc) {
            doc = await vscode.workspace.openTextDocument(uri)
            await vscode.window.showTextDocument(doc)
        }
        if (doc.getText() !== text) {
            await setDocText(doc, text)
        }
    }

    async function renameDeclaration(symbol) {
        const idx = doc.getText().indexOf("let " + symbol)
        nodeAssert.notStrictEqual(
            idx,
            -1,
            `current text should contain the '${symbol}' declaration`
        )
        return vscode.commands.executeCommand(
            "vscode.executeDocumentRenameProvider",
            doc.uri,
            doc.positionAt(idx + 4),
            "Renamed_" + symbol
        )
    }

    before(async function () {
        await writeVersion(VERSION_A)

        // 预热屏障：等待 rename 链路可用
        await eventually(
            async () => {
                const we = await renameDeclaration("vAlpha1")
                nodeAssert.ok(we && we.entries().length > 0, "rename pipeline not ready")
                return true
            },
            { message: "rename pipeline warmup timed out" }
        )
    })

    it("rename response edit ranges hit the target symbol in the document version at response arrival @known-bug", async function () {
        const delays = [0, 2, 5, 10, 20, 40]
        const incidents = []

        for (let round = 0; round < 2; round++) {
            for (const delayMs of delays) {
                await writeVersion(VERSION_A)

                const { response, sampled } = await raceRequest({
                    doc,
                    requestFn: () => renameDeclaration("vAlpha1"),
                    nextText: VERSION_B,
                    delayMs
                })
                if (!response) {
                    continue
                }
                for (const [, edits] of response.entries()) {
                    for (const e of edits) {
                        const hit = sampled.slice(
                            doc.offsetAt(e.range.start),
                            doc.offsetAt(e.range.end)
                        )
                        if (hit !== "vAlpha1") {
                            incidents.push({ delayMs, round, hit: JSON.stringify(hit) })
                        }
                    }
                }
            }
        }
        await writeVersion(VERSION_A)

        nodeAssert.deepStrictEqual(
            incidents,
            [],
            `rename returned stale coordinates (edit range missed the vAlpha1 symbol from request time, would corrupt the file): ` +
                JSON.stringify(incidents)
        )
    })
})
