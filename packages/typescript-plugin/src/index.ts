import type TS from "typescript"
import type { ConfigPluginParms } from "../../../types/communication"

import {
    proxyTypescriptLanguageServiceMethods,
    ProxyTypescriptSessionAndProjectServiceMethods
} from "./proxies"
import { ts, setState } from "./state"
import { createIpcServer } from "./server"
import { recordRealPath } from "./util/qingkuai"
import { isUndefined } from "../../../shared-util/assert"
import { initQingkuaiConfig } from "./server/configuration/method"

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

        onConfigurationChanged(params: ConfigPluginParms) {
            createIpcServer(params.sockPath)
            recordRealPath(params.triggerFileName)
            initQingkuaiConfig(params.configurations)
        }
    }
}
