const vscode = require("vscode")
const nodePath = require("node:path")
const nodeAssert = require("node:assert")

const { raceRequest } = require("../utils/reconcile")
const { util: qingkuaiUtil } = require("qingkuai/compiler")
const { eventually, setDocText, inlaySignature } = require("../utils/helpers")

const VERSION_A = qingkuaiUtil.formatSourceCode(`
    <lang-js>
        let vAlpha1 = reactive(1)
        let vAlpha2 = reactive(2)
    </lang-js>
    
    <p>{vAlpha1}</p>
`)
const VERSION_B = qingkuaiUtil.formatSourceCode(`
    <lang-js>
        let vBeta1 = reactive(1)
    </lang-js>
    
    <p>{vBeta1}</p>
`)

describe("inlay-hints/drift", function () {
    let doc, uri

    async function writeVersion(text) {
        const ws = vscode.workspace.workspaceFolders[0]
        uri = vscode.Uri.file(nodePath.join(ws.uri.fsPath, "inlay-hints", "drift.qk"))
        if (!doc) {
            // 仅在首次建文档时落盘以生成文件；文档已打开后再落盘会触发 VSCode 重载，
            // 与在途的缓冲区编辑形成版本竞态（applyEdit 被拒），故后续版本切换只改缓冲区
            await vscode.workspace.fs.writeFile(uri, Buffer.from(text))
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
            {
                deadline: 60000,
                message: "inlay pipeline warm-up timed out"
            }
        )
    })

    it("inlay responses stay on a coherent document version and converge after the storm", async function () {
        // 编辑风暴期内的每个内联提示响应，要么被扩展中间件丢弃（版本变化），要么是某个 文档
        // 版本上的正确提示，风暴结束后必须收敛回当前文档版本，这是"陈旧响应不滞留"的可判定部分
        const expectedA = await calibrate(VERSION_A)
        const expectedB = await calibrate(VERSION_B)
        const delays = [0, 2, 5, 10, 20, 40]
        const incidents = []
        let observed = 0

        for (let round = 0; round < 2; round++) {
            for (const delayMs of delays) {
                await writeVersion(VERSION_A)

                const { response } = await raceRequest({
                    doc,
                    requestFn: fetchHints,
                    nextText: VERSION_B,
                    delayMs
                })
                const sig = inlaySignature(response)
                if (sig === "[]") {
                    continue
                }
                observed++
                if (sig !== expectedA && sig !== expectedB) {
                    incidents.push({ delayMs, round, got: sig })
                }
            }
        }

        // 竞态阶段必须真的观察到非空响应，否则断言被空响应架空、用例静默失效
        nodeAssert.ok(
            observed > 0,
            "race phase should observe at least one non-empty inlay response"
        )

        nodeAssert.deepStrictEqual(
            incidents,
            [],
            "inlay hints returned a response that matches no document version: " +
                JSON.stringify(incidents)
        )

        await writeVersion(VERSION_A)
        await eventually(
            async () => {
                const sig = inlaySignature(await fetchHints())
                nodeAssert.strictEqual(
                    sig,
                    expectedA,
                    `inlay hints should converge back to the current document version, got: ${sig}`
                )
                return sig
            },
            {
                deadline: 20000,
                message: "inlay hints did not converge back to the current document version"
            }
        )
    })
})
