import type TS from "typescript"
import type { QingkuaiConfigurationWithDir } from "../../../types/common"

import fs from "fs"

import {
    proxyFileExists,
    proxyEditContent,
    proxyGetScriptKind,
    proxyGetDiagnostics,
    proxyGetScriptVersion,
    proxyGetScriptSnapshot,
    proxyGetScriptFileNames,
    proxyOnConfigFileChanged,
    proxyResolveModuleNameLiterals
} from "./proxies"
import { attachChangeConfig } from "./server/config"
import { isUndefined } from "../../../shared-util/assert"
import { attachGetDiagnostic } from "./server/diagnostic/handler"
import { attachGetCompletion } from "./server/completion/handler"
import { createServer } from "../../../shared-util/ipc/participant"
import { configurations, setServer, setTSState, ts, typeRefStatement } from "./state"
import { attachDocumentManager, attachUpdateSnapshot } from "./server/content/handler"

export = function init(modules: { typescript: typeof TS }) {
    return {
        create(info: TS.server.PluginCreateInfo) {
            if (isUndefined(ts)) {
                setTSState(modules.typescript, info)

                // 代理typescript语言服务的原始方法
                proxyFileExists()
                proxyEditContent()
                proxyGetScriptKind()
                proxyGetDiagnostics()
                proxyGetScriptVersion()
                proxyGetScriptSnapshot()
                proxyGetScriptFileNames()
                proxyOnConfigFileChanged()
                proxyResolveModuleNameLiterals()
            }
            return Object.assign({}, info.languageService)
        },

        onConfigurationChanged(params: {
            sockPath: string
            configurations: QingkuaiConfigurationWithDir[]
        }) {
            params.configurations.forEach(item => {
                configurations.set(item.dir, item)
            })

            // 创建ipc通道，并监听来自qingkuai语言服务器的请求
            if (!fs.existsSync(params.sockPath)) {
                createServer(params.sockPath).then(server => {
                    const init = "getQingkuaiDtsReferenceStatement"
                    setServer(server)
                    attachChangeConfig()
                    attachGetDiagnostic()
                    attachGetCompletion()
                    attachUpdateSnapshot()
                    attachDocumentManager()
                    server.onRequest("getQingkuaiDtsReferenceStatement", () => typeRefStatement)
                })
            }
        }
    }
}
