import type TS from "typescript"

import {
    proxyEditContent,
    proxyFileExists,
    proxyGetScriptKind,
    proxyGetScriptSnapshot,
    proxyOnConfigFileChanged,
    proxyResolveModuleNameLiterals
} from "./proxies"
import fs from "fs"
import { isUndefined } from "../../../shared-util/assert"
import { attachGetDiagnostic } from "./server/diagnostic"
import { attachDocumentManager } from "./server/document"
import { attachUpdateSnapshot } from "./server/updateSnapshot"
import { createServer } from "../../../shared-util/ipc/participant"
import { setServer, setTSState, ts, typeRefStatement } from "./state"

export = function init(modules: { typescript: typeof TS }) {
    function create(info: TS.server.PluginCreateInfo) {
        if (isUndefined(ts)) {
            setTSState(modules.typescript, info)

            // 代理typescript语言服务的原始方法
            proxyFileExists()
            proxyEditContent()
            proxyGetScriptKind()
            proxyGetScriptSnapshot()
            proxyOnConfigFileChanged()
            proxyResolveModuleNameLiterals()
        }
        return Object.assign({}, info.languageService)
    }

    function onConfigurationChanged({ sockPath }: any) {
        // 创建ipc通道，并监听来自qingkuai语言服务器的请求
        // fs.appendFileSync("/tmp/.temp", "\n???", "utf-8")
        if (!fs.existsSync(sockPath)) {
            createServer(sockPath).then(server => {
                setServer(server)
                attachGetDiagnostic()
                attachUpdateSnapshot()
                attachDocumentManager()
                server.onRequest("getQingkuaiDtsReferenceStatement", () => {
                    return typeRefStatement
                })
            })
        }
    }

    return { create, onConfigurationChanged }
}
