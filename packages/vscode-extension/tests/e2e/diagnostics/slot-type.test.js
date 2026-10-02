const vscode = require("vscode")
const nodeAssert = require("node:assert")

const { openFixture, eventually, diagnosticsOf } = require("../utils/helpers")

describe("diagnostics/slot-type", function () {
    it("slot context accessing an undeclared member should error @known-bug", async function () {
        // 【已确认 BUG】#slot={ctx from "name"} 解构出的上下文未携带子组件插槽属性类型
        // （当前 slotCtx 为 any，访问不存在成员零诊断）。
        // 对照组：#then 解构变量的成员类型校验是生效的（见 type-validation.test.js）。
        await openFixture("diagnostics", "slot-child.qk")

        const doc = await openFixture("diagnostics", "slot-parent-bad.qk")
        await eventually(
            () => {
                const errs = diagnosticsOf(doc.uri).filter(
                    d => d.severity === vscode.DiagnosticSeverity.Error
                )
                nodeAssert.ok(
                    errs.some(d => /nopeMember/.test(d.message)),
                    `slot context undeclared member should report TS2339, got: ${JSON.stringify(errs.map(d => d.message))}`
                )
                return true
            },
            { message: "slot context type error diagnostic did not arrive" }
        )
    })

    it("slot context accessing a declared member should not error", async function () {
        await openFixture("diagnostics", "slot-child.qk")

        const doc = await openFixture("diagnostics", "slot-parent-good.qk")
        await eventually(
            () => {
                const errs = diagnosticsOf(doc.uri).filter(
                    d => d.severity === vscode.DiagnosticSeverity.Error
                )
                nodeAssert.strictEqual(
                    errs.length,
                    0,
                    `correct slot context access should not error, got: ${JSON.stringify(errs.map(d => d.message))}`
                )
                return true
            },
            { message: "error diagnostic present for correct slot usage" }
        )
    })
})
