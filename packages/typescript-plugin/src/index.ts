import type TS from "typescript"
import type { ConfigPluginParms } from "../../../types/communication"

import { ts, setState } from "./state"
import { proxyTypescript } from "./proxy"
import { createIpcServer } from "./server"
import { initializeAdapter } from "./adapter"
import { isUndefined } from "../../../shared-util/assert"
import { qkContext } from "qingkuai-language-service/adapters"
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
                initializeAdapter(modules.typescript)
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
            return proxyTypescript(info), Object.assign({}, info.languageService)
        },

        onConfigurationChanged(params: ConfigPluginParms) {
            createIpcServer(params.sockPath)
            initQingkuaiConfig(params.configurations)
            qkContext.recordRealPath(params.triggerFileName)
        }
    }
}
