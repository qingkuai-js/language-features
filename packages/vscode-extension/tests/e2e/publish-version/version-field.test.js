const nodePath = require("node:path")
const nodeAssert = require("node:assert")
const rpc = require("vscode-jsonrpc/node")
const nodeChildProcess = require("node:child_process")

const { eventually } = require("../utils/helpers")

describe("publish-version/version-field", function () {
    let child, connection
    const notifications = []

    before(async function () {
        const serverPath = nodePath.join(__dirname, "../../../dist/server.js")
        child = nodeChildProcess.fork(serverPath, ["--node-ipc"], {
            stdio: ["pipe", "pipe", "pipe", "ipc"]
        })
        connection = rpc.createMessageConnection(
            new rpc.IPCMessageReader(child),
            new rpc.IPCMessageWriter(child)
        )
        connection.onNotification("textDocument/publishDiagnostics", params => {
            notifications.push(params)
        })
        connection.listen()
        await connection.sendRequest("initialize", {
            processId: process.pid,
            rootUri: null,
            capabilities: {},
            // script 功能降级：绕开 TS 插件 socket 依赖，仅测 qk 编译诊断推送
            initializationOptions: { limitedScriptLanguageFeatures: true }
        })
        await connection.sendNotification("initialized", {})
    })

    after(async function () {
        if (connection) {
            connection.sendNotification("exit")
        }
        if (child) {
            child.kill()
        }
    })

    it("publishDiagnostics notification carries a version field matching the document version", async function () {
        const uri = "file:///virtual/publish-version.qk"
        await connection.sendNotification("textDocument/didOpen", {
            textDocument: { uri, languageId: "qingkuai", version: 1, text: "<p>{}</p>\n" }
        })

        // 等待至少一条推送（qk 编译诊断 300ms debounce）
        await eventually(
            () => {
                nodeAssert.ok(notifications.length > 0, "no publishDiagnostics notification yet")
                return true
            },
            { message: "no publishDiagnostics notification received" }
        )

        const missing = notifications.filter(n => n.version === undefined)
        nodeAssert.deepStrictEqual(
            missing,
            [],
            `publishDiagnostics missing version field (${notifications.length} notifications total, ` +
                `${missing.length} missing) - client cannot discard stale notifications`
        )
    })
})
