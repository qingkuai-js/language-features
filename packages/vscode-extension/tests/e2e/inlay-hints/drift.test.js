const vscode = require("vscode")
const nodeAssert = require("node:assert")
const nodePath = require("node:path")

const { eventually, setDocText, inlaySignature } = require("../utils/helpers")
const { raceRequest } = require("../utils/reconcile")

const VERSION_A =
    "<lang-js>\n    let vAlpha1 = reactive(1)\n    let vAlpha2 = reactive(2)\n</lang-js>\n\n<p>{vAlpha1}</p>\n"
const VERSION_B = "<lang-js>\n    let vBeta1 = reactive(1)\n</lang-js>\n\n<p>{vBeta1}</p>\n"

describe("inlay-hints/drift", function () {
    let doc, uri

    async function writeVersion(text) {
        const ws = vscode.workspace.workspaceFolders[0]
        uri = vscode.Uri.file(nodePath.join(ws.uri.fsPath, "inlay-hints", "drift.qk"))
        await vscode.workspace.fs.writeFile(uri, Buffer.from(text))
        if (!doc) {
            doc = await vscode.workspace.openTextDocument(uri)
            await vscode.window.showTextDocument(doc)
        }
        if (doc.getText() !== text) {
            await setDocText(doc, text)
        }
    }

    async function fetchHints() {
        return vscode.commands.executeCommand(
            "vscode.executeInlayHintProvider",
            doc.uri,
            new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length))
        )
    }

    /** 校准：在稳态下取两个版本各自的期望签名 */
    async function calibrate(text) {
        await writeVersion(text)
        return eventually(
            async () => {
                const sig = inlaySignature(await fetchHints())
                nodeAssert.ok(sig !== "[]", "inlay hints should not be empty in steady state")
                return sig
            },
            { message: "inlay hints calibration timed out" }
        )
    }

    before(async function () {
        await writeVersion(VERSION_A)
        await eventually(
            async () => {
                nodeAssert.notStrictEqual(
                    inlaySignature(await fetchHints()),
                    "[]",
                    "pipeline not ready"
                )
                return true
            },
            { message: "inlay pipeline warm-up timed out" }
        )
    })

    it("inlay response matches the document version at response arrival", async function () {
        const expectedA = await calibrate(VERSION_A)
        const expectedB = await calibrate(VERSION_B)
        const delays = [0, 2, 5, 10, 20, 40]
        const incidents = []

        for (let round = 0; round < 2; round++) {
            for (const delayMs of delays) {
                await writeVersion(VERSION_A)

                const { response, sampled } = await raceRequest({
                    doc,
                    requestFn: fetchHints,
                    nextText: VERSION_B,
                    delayMs
                })
                const expected =
                    sampled === VERSION_A ? expectedA : sampled === VERSION_B ? expectedB : null
                if (expected === null) {
                    continue
                }

                const sig = inlaySignature(response)
                if (sig === "[]") {
                    continue
                }
                if (sig !== expected) {
                    incidents.push({ delayMs, round, got: sig, expected })
                }
            }
        }
        await writeVersion(VERSION_A)

        nodeAssert.deepStrictEqual(
            incidents,
            [],
            "inlay hints returned a stale response that does not match the current document version: " +
                JSON.stringify(incidents)
        )
    })
})
