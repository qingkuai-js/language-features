import type TS from "typescript"

import {
    proxyEditContent,
    proxyGetScriptKind,
    proxyCloseClientFile,
    proxyGetScriptSnapshot,
    proxyOnConfigFileChanged,
    proxyResolveModuleNameLiterals
} from "./proxies"
import { attachGetDiagnostic } from "./server/diagnostic"
import { attachDocumentManager } from "./server/document"
import { attachUpdateSnapshot } from "./server/updateSnapshot"
import { setServer, setTSState, typeRefStatement } from "./state"
import { createServer } from "../../../shared-util/ipc/participant"

export = function init(modules: { typescript: typeof TS }) {
    function create(info: TS.server.PluginCreateInfo) {
        setTSState(modules.typescript, info)

        // 代理typescript语言服务的原始方法
        proxyEditContent()
        proxyGetScriptKind()
        proxyCloseClientFile()
        proxyGetScriptSnapshot()
        proxyOnConfigFileChanged()
        proxyResolveModuleNameLiterals()

        return Object.assign({}, info.languageService)
    }

    function onConfigurationChanged(config: any) {
        // 创建ipc通道，并监听来自qingkuai语言服务器的请求
        createServer(config.sockPath).then(server => {
            setServer(server)
            attachGetDiagnostic()
            attachUpdateSnapshot()
            attachDocumentManager()
            server.onRequest("getQingkuaiDtsReferenceStatement", () => {
                return typeRefStatement
            })
        })
    }

    return { create, onConfigurationChanged }
}
