import type TS from "typescript"

import {
    proxyFileExists,
    proxyEditContent,
    proxyGetScriptKind,
    proxyGetScriptVersion,
    proxyGetScriptSnapshot,
    proxyGetScriptFileNames,
    proxyOnConfigFileChanged,
    proxyResolveModuleNameLiterals
} from "./proxies"
import fs from "fs"
import { isUndefined } from "../../../shared-util/assert"
import { attachGetDiagnostic } from "./server/diagnostic/handler"
import { createServer } from "../../../shared-util/ipc/participant"
import { setServer, setTSState, ts, typeRefStatement } from "./state"
import { attachDocumentManager, attachUpdateSnapshot } from "./server/content/handler"

export = function init(modules: { typescript: typeof TS }) {
    function create(info: TS.server.PluginCreateInfo) {
        // @ts-expect-error: access private property
        if (isUndefined(ts) && info.session.currentRequestId !== 1) {
            setTSState(modules.typescript, info)

            // 代理typescript语言服务的原始方法
            proxyFileExists()
            proxyEditContent()
            proxyGetScriptKind()
            proxyGetScriptVersion()
            proxyGetScriptSnapshot()
            proxyGetScriptFileNames()
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
