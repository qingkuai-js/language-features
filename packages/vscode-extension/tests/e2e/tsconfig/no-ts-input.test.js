const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually, diagnosticsOf, waitForNoErrors } = require("../utils/helpers")

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
        await waitForNoErrors(configDoc.uri, {
            duration: 2000,
            interval: 200,
            hold: true,
            failOnAnyError: true,
            forbidden: ["No inputs were found"]
        })
    })
})
