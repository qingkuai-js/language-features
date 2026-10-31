const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually, diagnosticsOf } = require("../utils/helpers")

// 目录里只有 .qk 时，tsconfig 的 strict 仍然生效（证明 Configured project 已建立且 .qk 被注入），
// 同时 tsconfig.json 不能出现“没有任何输入文件”的错误
describe("tsconfig/no-ts-input", function () {
    it("keeps a qingkuai-only project without missing-input errors", async function () {
        const doc = await openFixture("tsconfig", "app.qk")
        await eventually(() => {
            const messages = diagnosticsOf(doc.uri)
                .filter(diagnostic => diagnostic.severity === vscode.DiagnosticSeverity.Error)
                .map(diagnostic => diagnostic.message)
            nodeAssert.ok(
                messages.some(message => /assignable/.test(message)),
                `expected a type error from the strict tsconfig, got: ${JSON.stringify(messages)}`
            )
            return true
        })

        const configDoc = await openFixture("tsconfig", "tsconfig.json")
        await expectNoErrors(configDoc.uri)
    })
})

// 反向断言需要观察窗口：期限内出现任何错误或“没有输入文件”都失败
async function expectNoErrors(uri, duration = 2000) {
    const end = Date.now() + duration
    while (Date.now() < end) {
        const diagnostics = diagnosticsOf(uri)
        const errors = diagnostics.filter(
            diagnostic => diagnostic.severity === vscode.DiagnosticSeverity.Error
        )
        nodeAssert.strictEqual(
            errors.length,
            0,
            `tsconfig.json should not report errors, got: ${JSON.stringify(errors.map(error => error.message))}`
        )
        nodeAssert.ok(
            !diagnostics.some(diagnostic => diagnostic.message.includes("No inputs were found")),
            "tsconfig.json should not report missing input files"
        )
        await new Promise(resolve => setTimeout(resolve, 200))
    }
}
