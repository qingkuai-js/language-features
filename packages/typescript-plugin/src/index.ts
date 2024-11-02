import type TS from "typescript"

import { attachServerHandlers } from "../server"
import { rmSockFile } from "../../../shared-util/ipc/sock"
import { proxyGetScriptSnapshot } from "./proxy/getSnapshot"
import { createServer } from "../../../shared-util/ipc/server"
import { proxyResolveModuleNameLiterals } from "./proxy/resolveModule"
import { setServer, setTSState, languageService, project } from "./state"

export = function init(modules: { typescript: typeof TS }) {
    function create(info: TS.server.PluginCreateInfo) {
        setTSState(modules.typescript, info)

        // 创建ipc通道，并监听来自qingkuai语言服务器的请求
        if (project.projectKind) {
            rmSockFile("qingkuai")
            createServer("qingkuai").then(server => {
                setServer(server)
                attachServerHandlers()
                server.send("connectDone", null)
            })
        }

        // 代理typescript语言服务的原始方法
        proxyGetScriptSnapshot()
        proxyResolveModuleNameLiterals()

        return Object.assign({}, languageService)
    }

    return { create }
}
