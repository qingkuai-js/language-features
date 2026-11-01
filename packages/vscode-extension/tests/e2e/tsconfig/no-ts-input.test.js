const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually, diagnosticsOf, waitForNoErrors } = require("../utils/helpers")

// 无配置也能编译的产物错误，用作“已出诊断”的正向信号
const EMPTY_INTERPOLATION_HINT = "Empty interpolation expression block is not allowed"

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

    it("keeps a jsconfig project without missing-input errors", async function () {
        const doc = await openFixture("jsconfig", "app.qk")
        await eventually(() => {
            const messages = diagnosticsOf(doc.uri)
                .filter(diagnostic => diagnostic.severity === vscode.DiagnosticSeverity.Error)
                .map(diagnostic => diagnostic.message)
            nodeAssert.ok(
                messages.some(message => /assignable/.test(message)),
                `expected a type error from the strict jsconfig, got: ${JSON.stringify(messages)}`
            )
            return true
        })

        const configDoc = await openFixture("jsconfig", "jsconfig.json")
        await waitForNoErrors(configDoc.uri, {
            duration: 2000,
            interval: 200,
            hold: true,
            failOnAnyError: true,
            forbidden: ["No inputs were found"]
        })
    })

    it("applies checkJs from jsconfig to js script blocks", async function () {
        const doc = await openFixture("jsconfig", "app-js.qk")
        await eventually(() => {
            const messages = diagnosticsOf(doc.uri)
                .filter(diagnostic => diagnostic.severity === vscode.DiagnosticSeverity.Error)
                .map(diagnostic => diagnostic.message)
            nodeAssert.ok(
                messages.some(message => /assignable/.test(message)),
                `expected a JS type error from checkJs, got: ${JSON.stringify(messages)}`
            )
            return true
        })
    })

    it("does not check js script blocks when checkJs is off", async function () {
        const doc = await openFixture("jsconfig-off", "app-js.qk")
        await eventually(() => {
            const messages = diagnosticsOf(doc.uri)
                .filter(diagnostic => diagnostic.severity === vscode.DiagnosticSeverity.Error)
                .map(diagnostic => diagnostic.message)
            nodeAssert.ok(
                messages.some(message => message.includes(EMPTY_INTERPOLATION_HINT)),
                `the component should be compiled, got: ${JSON.stringify(messages)}`
            )
            nodeAssert.ok(
                !messages.some(message => /assignable/.test(message)),
                "checkJs is off, JS type errors must not appear"
            )
            return true
        })

        // 观察窗：类型错误不能延迟出现
        const end = Date.now() + 1000
        while (Date.now() < end) {
            const messages = diagnosticsOf(doc.uri)
                .filter(diagnostic => diagnostic.severity === vscode.DiagnosticSeverity.Error)
                .map(diagnostic => diagnostic.message)
            nodeAssert.ok(
                !messages.some(message => /assignable/.test(message)),
                "checkJs is off, JS type errors must not appear"
            )
            await new Promise(resolve => setTimeout(resolve, 250))
        }
    })
})
