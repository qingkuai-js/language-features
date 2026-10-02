const vscode = require("vscode")

const { openFixture, waitForWorkspaceReady } = require("./helpers")

process.on("unhandledRejection", (reason, promise) => {
    const message = String((reason && reason.message) || reason).split("\n")[0]
    console.error(`[unhandledRejection] ${message}`)
    promise.catch(() => {})
})

// 所有套件开始前驱动扩展激活并等待语言服务全链路就绪
exports.mochaGlobalSetup = async function () {
    const extension = vscode.extensions.getExtension("qingkuai-tools.qingkuai-language-features")
    if (!extension) {
        throw new Error("qingkuai-language-features extension should be present")
    }
    await extension.activate()
    await openFixture("navigation", "app.qk")
    await waitForWorkspaceReady()
}
