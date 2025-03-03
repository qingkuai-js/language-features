import type TS from "typescript"
import type { QingkuaiConfigurationWithDir } from "../../../types/common"

import {
    proxyTypescriptProjectServiceMethods,
    proxyTypescriptLanguageServiceMethods
} from "./proxy"
import fs from "fs"
import { isUndefined } from "../../../shared-util/assert"
import { attachGetDiagnostic } from "./server/diagnostic/handler"
import { attachGetCompletion } from "./server/completion/handler"
import { initQingkuaiConfig } from "./server/configuration/method"
import { createServer } from "../../../shared-util/ipc/participant"
import { attachChangeConfig } from "./server/configuration/handler"
import { attachDocumentManager, attachUpdateSnapshot } from "./server/content/handler"
import { ts, setServer, setTSState, typeRefStatement, setTriggerQingkuaiFileName } from "./state"

export = function init(modules: { typescript: typeof TS }) {
    return {
        create(info: TS.server.PluginCreateInfo) {
            if (isUndefined(ts)) {
                setTSState(modules.typescript, info)
                proxyTypescriptProjectServiceMethods()

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
            setTriggerQingkuaiFileName(params.triggerFileName)

            // 创建ipc通道，并监听来自qingkuai语言服务器的请求
            if (!fs.existsSync(params.sockPath)) {
                createServer(params.sockPath).then(server => {
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
