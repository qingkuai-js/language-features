const nodeAssert = require("node:assert")
const { util } = require("qingkuai/compiler")

/**
 * 气球断言（balloon assertion），格式沿用 vscode-tmgrammar-test 的 .test 惯例：
 *
 *     checkTokens(tokenize, `
 *         <div>{count}</div>
 *         ^ punctuation.definition.tag.begin.qk
 *          ^^^ entity.name.tag.qk
 *         `)
 *
 * - fixture 可整体缩进以贴合调用处代码风格：formatSourceCode 以首行前导空白
 *   为基准统一剥离（气球行与源码行同享剥离，相对列不变）；首行顶格时为
 *   no-op，两种写法并存兼容
 * - 以 "^[空格^]*" 开头的行是气球行，标注其上方最近的源码行
 * - 一个气球行内可以有多个 "^" 段（/(\^+)/g 提取），共享最后一个段之后的
 *   scope 列表（精确名，单空格分隔）
 * - 断言语义：区间必须被恰好一个 token 完整覆盖（起点终点都吻合），
 *   且该 token 的 scope 栈包含列出的每一个 scope
 * - 气球行不参与 token 化：先剥离全部气球行、只对源码行做整体 token 化
 *   （跨行 ruleStack 保持连续），气球再按源码行序号对齐
 */
function checkTokens(tokenize, text, label) {
    const normalized = util.formatSourceCode(text)
    const rows = normalized.split("\n").map((row, index) => ({
        text: row,
        isBalloon: /^\s*\^/.test(row),
        index
    }))

    const sourceRows = rows.filter(row => !row.isBalloon)
    const doc = tokenize(sourceRows.map(row => row.text).join("\n"))
    nodeAssert.strictEqual(
        doc.length,
        sourceRows.length,
        `${label}: tokenizer produced ${doc.length} lines for ${sourceRows.length} source lines`
    )

    let sourceCursor = -1
    for (const row of rows) {
        if (row.isBalloon) {
            nodeAssert.ok(
                sourceCursor >= 0,
                `${label}: balloon line ${row.index + 1} has no preceding source line`
            )
            assertBalloonLine(
                doc[sourceCursor],
                sourceRows[sourceCursor].text,
                row.text,
                sourceCursor + 1,
                row.index + 1,
                label
            )
        } else {
            sourceCursor++
        }
    }
}

function assertBalloonLine(lineObj, sourceLine, balloonLine, sourceNo, balloonNo, label) {
    const where = `${label}: source line ${sourceNo}`
    const lineTokens = lineObj.tokens

    // 解析气球行：所有 "^" 段共享段后 scope 列表
    const ranges = []
    const RUN_RE = /\^+/g
    let match
    while ((match = RUN_RE.exec(balloonLine)) !== null) {
        ranges.push({ start: match.index, end: match.index + match[0].length, scopes: [] })
    }
    nodeAssert.ok(ranges.length > 0, `${where}: balloon line ${balloonNo} has no "^" run`)
    const scopeText = balloonLine.slice(ranges[ranges.length - 1].end).trim()
    if (scopeText !== "") {
        const scopes = scopeText.split(/ +/)
        for (const range of ranges) {
            range.scopes = scopes
        }
    }

    for (const range of ranges) {
        const at = `${where} [${range.start},${range.end})`
        const covering = lineTokens.filter(
            t => t.endIndex > range.start && t.startIndex < range.end
        )
        const exact = covering.find(t => t.startIndex === range.start && t.endIndex === range.end)
        nodeAssert.ok(
            exact,
            `${at}: expected exactly one token spanning the range, got ` +
                covering
                    .map(
                        t =>
                            `[${t.startIndex},${t.endIndex}) ${JSON.stringify(sourceLine.slice(t.startIndex, t.endIndex))}`
                    )
                    .join(", ") +
                `\nsource:   ${JSON.stringify(sourceLine)}\nballoon:  ${JSON.stringify(balloonLine)}`
        )
        for (const expected of range.scopes) {
            nodeAssert.ok(
                exact.scopes.includes(expected),
                `${at}: scope stack ${JSON.stringify(exact.scopes)} does not include ${JSON.stringify(expected)}` +
                    `\nsource:   ${JSON.stringify(sourceLine)}\nballoon:  ${JSON.stringify(balloonLine)}`
            )
        }
    }
}

module.exports = { checkTokens }
