import type TS from "typescript"
import type { QingkuaiConfigurationWithDir } from "../../../types/common"

import {
    proxyTypescriptLanguageServiceMethods,
    ProxyTypescriptSessionAndProjectServiceMethods
} from "./proxies"
import { existsSync } from "node:fs"
import { forEachProject } from "./util/typescript"
import { attachLanguageServerIPCHandlers } from "./server"
import { TPICHandler } from "../../../shared-util/constant"
import { initQingkuaiConfig } from "./server/configuration/method"
import { createServer } from "../../../shared-util/ipc/participant"
import { isQingkuaiFileName, isUndefined } from "../../../shared-util/assert"
import { ts, server, setState, typeRefStatement, lsProjectKindChanged } from "./state"
import { ensureGetSnapshotOfQingkuaiFile, getRealPath, recordRealPath } from "./util/qingkuai"

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
            recordRealPath(params.triggerFileName)
            initQingkuaiConfig(params.configurations)

            // 创建ipc通道，并监听来自qingkuai语言服务器的请求
            setTimeout(() => {
                if (!existsSync(params.sockPath)) {
                    createServer(params.sockPath).then(server => {
                        setState({ server })
                        attachLanguageServerIPCHandlers()
                        ensureLanguageServerProjectKind()
                        server.onRequest("getQingkuaiDtsReferenceStatement", () => typeRefStatement)
                    })
                }
            })
        }
    }
}

function ensureLanguageServerProjectKind() {
    forEachProject(p => {
        if (lsProjectKindChanged) {
            return
        }

        for (const fileName of p.getFileNames()) {
            const realPath = getRealPath(fileName)
            if (!isQingkuaiFileName(realPath || "")) {
                continue
            }

            const qingkuaiSnapshot = ensureGetSnapshotOfQingkuaiFile(realPath!)
            if (qingkuaiSnapshot.scriptKind === ts.ScriptKind.TS) {
                setState({
                    lsProjectKindChanged: true
                })
                server.sendNotification(TPICHandler.InfferedProjectAsTypescript, null)
                break
            }
        }
    })
}
