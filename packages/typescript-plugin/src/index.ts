import type TS from "typescript"

import { attachServerHandlers } from "./server"
import { setServer, setTSState } from "./state"
import { createServer } from "../../../shared-util/ipc"
import { rmSockFile } from "../../../shared-util/ipc/sock"
import { proxyGetScriptSnapshot } from "./proxy/getSnapshot"
import { proxyResolveModuleNameLiterals } from "./proxy/resolveModule"

export = function init(modules: { typescript: typeof TS }) {
    function create(info: TS.server.PluginCreateInfo) {
        if (info.project.projectKind) {
            setTSState(modules.typescript, info)

            // 创建ipc通道，并监听来自qingkuai语言服务器的请求
            rmSockFile("qingkuai")
            createServer("qingkuai").then(server => {
                setServer(server)
                attachServerHandlers()
                server.sendNotification("connectDone", null)
            })

            // 代理typescript语言服务的原始方法
            proxyGetScriptSnapshot()
            proxyResolveModuleNameLiterals()
        }

        return Object.assign({}, info.languageService)
    }

    return { create }
}
