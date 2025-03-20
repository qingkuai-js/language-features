import type TS from "typescript"
import type { QingkuaiConfigurationWithDir } from "../../../types/common"

import {
    proxyTypescriptLanguageServiceMethods,
    ProxyTypescriptSessionAndProjectServiceMethods
} from "./proxies"
import { existsSync } from "node:fs"
import { ts, setState, typeRefStatement } from "./state"
import { isUndefined } from "../../../shared-util/assert"
import { attachLanguageServerIPCHandlers } from "./server"
import { initQingkuaiConfig } from "./server/configuration/method"
import { createServer } from "../../../shared-util/ipc/participant"

export = function init(modules: { typescript: typeof TS }) {
    return {
        create(info: TS.server.PluginCreateInfo) {
            if (isUndefined(ts)) {
                setState({
                    session: info.session,
                    ts: modules.typescript,
                    projectService: info.project.projectService
                })
                ProxyTypescriptSessionAndProjectServiceMethods()
                info.project.projectService.setHostConfiguration({
                    extraFileExtensions: [
                        {
                            extension: ".qk",
                            isMixedContent: false,
                            scriptKind: modules.typescript.ScriptKind.Deferred
                        }
                    ]
                })
            }
            proxyTypescriptLanguageServiceMethods(info)
            return Object.assign({}, info.languageService)
        },

        onConfigurationChanged(params: {
            sockPath: string
            triggerFileName: string
            configurations: QingkuaiConfigurationWithDir[]
        }) {
            initQingkuaiConfig(params.configurations)

            // 创建ipc通道，并监听来自qingkuai语言服务器的请求
            if (!existsSync(params.sockPath)) {
                createServer(params.sockPath).then(server => {
                    setState({ server })
                    attachLanguageServerIPCHandlers()
                    server.onRequest("getQingkuaiDtsReferenceStatement", () => typeRefStatement)
                })
            }
        }
    }
}
