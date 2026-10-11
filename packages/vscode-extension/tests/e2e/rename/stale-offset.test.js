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

    async function renameDeclaration(symbol, newName = "Renamed_" + symbol) {
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
            newName
        )
    }

    function signatureOf(we) {
        return JSON.stringify(
            we
                .entries()[0][1]
                .map(e => [
                    e.range.start.line,
                    e.range.start.character,
                    e.range.end.line,
                    e.range.end.character,
                    e.newText
                ])
                .sort((a, b) => a[0] - b[0] || a[1] - b[1])
        )
    }

    // 校准：稳态下两个版本各自的正确改名形状；B 版按竞赛轮同款 newName 改名
    // vBeta1（旧位置在新版本缓冲上指向的符号），保证形状可逐字段对比
    async function calibrate(text, symbol) {
        await writeVersion(text)
        return eventually(
            async () => {
                const we = await renameDeclaration(symbol, "Renamed_vAlpha1")
                nodeAssert.ok(we && we.entries().length > 0, "rename should return edit entries")
                return signatureOf(we)
            },
            { message: "rename pipeline calibration timed out" }
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

    it("rename responses are correct for some document version (no mixed-basis or partial edits)", async function () {
        // 契约：编辑风暴期的每个 rename 响应，要么被扩展中间件丢弃（在途版本变化，
        // raceRequest 视为空响应），要么是"某个文档版本上的正确改名"（完整命中 A 版或
        // B 版的校准形状）。跨版本拼接（同一响应内混入不同基线的坐标）与残缺 token
        // 编辑才是写坏文件的事故形态。响应基线与到达时刻缓冲的偏差属于 VSCode 命令
        // API 无版本参数的固有竞态（命令回程中编辑镜像才落地），不在扩展可判定范围。
        const expectedA = await calibrate(VERSION_A, "vAlpha1")
        const expectedB = await calibrate(VERSION_B, "vBeta1")
        const delays = [0, 2, 5, 10, 20, 40]
        const incidents = []

        for (let round = 0; round < 2; round++) {
            for (const delayMs of delays) {
                await writeVersion(VERSION_A)

                const { response } = await raceRequest({
                    doc,
                    requestFn: () => renameDeclaration("vAlpha1"),
                    nextText: VERSION_B,
                    delayMs
                })
                if (!response) {
                    continue
                }
                const signature = signatureOf(response)
                if (signature !== expectedA && signature !== expectedB) {
                    incidents.push({ delayMs, round, signature })
                }
            }
        }
        await writeVersion(VERSION_A)

        nodeAssert.deepStrictEqual(
            incidents,
            [],
            `rename returned edits that match no document version (mixed-basis or partial-token edits, would corrupt the file): ` +
                JSON.stringify(incidents)
        )
    })
})
