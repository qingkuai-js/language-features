const vscode = require("vscode")
const nodeAssert = require("node:assert")

/** 打开 workspace 内的 fixture 并显示为活动编辑器 */
async function openFixture(...segments) {
    const ws = vscode.workspace.workspaceFolders[0]
    nodeAssert.ok(ws, "test workspace should be open")

    const uri = vscode.Uri.file(ws.uri.fsPath + "/" + segments.join("/"))
    const doc = await vscode.workspace.openTextDocument(uri)
    await vscode.window.showTextDocument(doc)
    return doc
}

/** 把内容写入 workspace 内的 fixture 并打开 */
async function writeFixture(segments, content) {
    const ws = vscode.workspace.workspaceFolders[0]
    nodeAssert.ok(ws, "test workspace should be open")

    const uri = vscode.Uri.file(ws.uri.fsPath + "/" + segments.join("/"))
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content))
    return openFixture(...segments)
}

/** 在活动编辑器上模拟键入 */
async function typeText(text) {
    await vscode.commands.executeCommand("default:type", { text })
}

/**
 * 轮询断言直到 fn 成功返回其值；超时抛出最后一条错误。
 * 所有语言服务异步到达类断言都必须经过它，禁止固定 sleep 后精断言。
 * deadline 对单次 fn 调用也是硬上界（race 兜底）：请求挂死时到点即判失败，
 * 不会拖到 mocha 全局超时。
 */
async function eventually(
    fn,
    { deadline = 5000, interval = 250, message = "eventually timed out" } = {}
) {
    const end = Date.now() + deadline
    let lastErr
    while (Date.now() < end) {
        let timer
        try {
            return await Promise.race([
                fn(),
                new Promise((_, reject) => {
                    timer = setTimeout(
                        () => reject(new Error(`single call exceeded ${end - Date.now()}ms`)),
                        end - Date.now()
                    )
                })
            ])
        } catch (e) {
            lastErr = e
        } finally {
            clearTimeout(timer)
        }
        await new Promise(resolve => setTimeout(resolve, interval))
    }
    throw new Error(message + (lastErr ? ": " + (lastErr.message || lastErr) : ""))
}

/**
 * 在打开的文档上用 WorkspaceEdit 做全文替换。
 * 对已打开的文档落盘会触发 VSCode 的文件重载，文档版本可能在 applyEdit 在途时跃迁，
 * 编辑随即被拒（"has changed in the meantime"）；而该重载落地的正是目标内容，因此把
 * "当前文本已等于目标" 视为成功，并对版本跃迁做有界重试，消除这层固有竞态。
 */
async function setDocText(doc, text) {
    for (let attempt = 0; attempt < 10; attempt++) {
        if (doc.getText() === text) {
            return
        }
        const edit = new vscode.WorkspaceEdit()
        edit.replace(
            doc.uri,
            new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length)),
            text
        )
        if (await vscode.workspace.applyEdit(edit)) {
            return
        }
        await new Promise(resolve => setTimeout(resolve, 50))
    }
    nodeAssert.ok(doc.getText() === text, "applyEdit should succeed")
}

/** 返回文档中第 occurrence 次出现 search 的位置 */
function posOf(doc, search, occurrence = 1, charShift = 0) {
    const text = doc.getText()
    let idx = -1
    for (let i = 0; i < occurrence; i++) {
        idx = text.indexOf(search, idx + 1)
        nodeAssert.notStrictEqual(
            idx,
            -1,
            `fixture should contain occurrence ${occurrence} of '${search}'`
        )
    }
    return doc.positionAt(idx + search.length + charShift)
}

/** 把 inlay hints 归一化为排序签名 [line, character, label]，供跨版本对账 */
function inlaySignature(hints) {
    return JSON.stringify(
        (hints || [])
            .map(h => [
                h.position.line,
                h.position.character,
                Array.isArray(h.label) ? h.label.map(p => p.value ?? "").join("") : String(h.label)
            ])
            .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    )
}

/** 读取某文档当前的合并诊断（诊断数组） */
function diagnosticsOf(uri) {
    return vscode.languages.getDiagnostics(uri)
}

/** 聚合 hover 提供者返回的首个非空 markdown 文本 */
async function firstHoverValue(doc, pos) {
    const hovers = await vscode.commands.executeCommand("vscode.executeHoverProvider", doc.uri, pos)
    if (!hovers || !hovers.length) return ""
    for (const h of hovers) {
        const c = h.contents && h.contents[0]
        const v = typeof c === "string" ? c : (c && c.value) || ""
        if (v.trim()) return v
    }
    return ""
}

/** 补全项 label 文本（兼容字符串与 CompletionItemLabel 两种形态） */
function labelOf(item) {
    return typeof item.label === "string" ? item.label : item.label.label
}

/** 请求文档偏移处的补全项，trigger 为可选触发字符 */
async function completeAt(doc, offset, trigger) {
    const list = await vscode.commands.executeCommand(
        "vscode.executeCompletionItemProvider",
        doc.uri,
        doc.positionAt(offset),
        trigger
    )
    return (list && list.items) || []
}

/** 轮询补全直到条件成立返回最终 items；超时返回最后采样（不抛错）；单次请求同受 deadline 硬约束 */
async function pollItems(doc, offset, cond, trigger, deadline = 5000) {
    const end = Date.now() + deadline
    let last = []
    while (Date.now() < end) {
        let timer
        try {
            last = await Promise.race([
                completeAt(doc, offset, trigger),
                new Promise(resolve => {
                    timer = setTimeout(() => resolve([]), end - Date.now())
                })
            ])
        } finally {
            clearTimeout(timer)
        }
        if (cond(last)) return last
        await new Promise(r => setTimeout(r, 300))
    }
    return last
}

/** 等待语言服务工作区就绪信号 */
async function waitForWorkspaceReady(timeout = 120000) {
    const ok = await vscode.commands.executeCommand("qingkuai.waitForWorkspaceReady", timeout)
    nodeAssert.ok(ok, "timed out waiting for language server workspace readiness")
}

module.exports = {
    openFixture,
    writeFixture,
    typeText,
    eventually,
    setDocText,
    posOf,
    inlaySignature,
    diagnosticsOf,
    firstHoverValue,
    labelOf,
    completeAt,
    pollItems,
    waitForWorkspaceReady
}
