import cp from "child_process"
import { expect, test } from "vitest"
import * as rpc from "vscode-jsonrpc/node"

const childProcess = cp.fork("./dist/server.js", ["--node-ipc"])
const connection = rpc.createMessageConnection(
    new rpc.IPCMessageReader(childProcess),
    new rpc.IPCMessageWriter(childProcess)
)
connection.listen()

// 调试消息输出通道
connection.onNotification("qingkuai/testLog", msg => {
    console.log(msg)
})

test("Connect to language server...", async () => {
    const res = await connection.sendRequest("ping")
    expect(res).toBe("pong")
})

export { connection }
