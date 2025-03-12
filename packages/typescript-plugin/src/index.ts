import type TS from "typescript"
import type { QingkuaiConfigurationWithDir } from "../../../types/common"

import {
    proxyTypescriptLanguageServiceMethods,
    proxyTypescriptProjectServiceAndSystemMethods
} from "./proxy"
import fs from "fs"
import { isUndefined } from "../../../shared-util/assert"
import { attachLanguageServerIPCHandlers } from "./server"
import { initQingkuaiConfig } from "./server/configuration/method"
import { createServer } from "../../../shared-util/ipc/participant"
import { ts, setState, typeRefStatement, projectService } from "./state"
import { initialEditQingkuaiFileSnapshot } from "./server/content/method"
import { ensureGetSnapshotOfQingkuaiFile, isQingkuaiFileName } from "./util/qingkuai"

export = function init(modules: { typescript: typeof TS }) {
    return {
        create(info: TS.server.PluginCreateInfo) {
            if (isUndefined(ts)) {
                setState({
                    session: info.session,
                    ts: modules.typescript,
                    projectService: info.project.projectService
                })
                proxyTypescriptProjectServiceAndSystemMethods()

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

            info.project.getFileNames().forEach(fileName => {
                if (!isQingkuaiFileName(fileName)) {
                    return
                }
                initialEditQingkuaiFileSnapshot(fileName)
            })

            proxyTypescriptLanguageServiceMethods(info)

            return Object.assign({}, info.languageService)
        },

        onConfigurationChanged(params: {
            sockPath: string
            triggerFileName: string
            configurations: QingkuaiConfigurationWithDir[]
        }) {
            initQingkuaiConfig(params.configurations)

            if (params.triggerFileName) {
                // @ts-expect-error: access private property
                const textStorage = projectService.getScriptInfo(params.triggerFileName).textStorage
                textStorage.svc = undefined
                textStorage.reload(
                    ensureGetSnapshotOfQingkuaiFile(params.triggerFileName).getFullText()
                )
            }

            // 创建ipc通道，并监听来自qingkuai语言服务器的请求
            if (!fs.existsSync(params.sockPath)) {
                createServer(params.sockPath).then(server => {
                    setState({ server })
                    attachLanguageServerIPCHandlers()
                    server.onRequest("getQingkuaiDtsReferenceStatement", () => typeRefStatement)
                })
            }
        }
    }
}
