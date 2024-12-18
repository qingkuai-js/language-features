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
import { attachGetDiagnostic } from "./server/diagnostic/handler"
import { attachGetCompletion } from "./server/completion/handler"
import { initQingkuaiConfig } from "./server/configuration/method"
import { createServer } from "../../../shared-util/ipc/participant"
import { attachChangeConfig } from "./server/configuration/handler"
import { isEmptyString, isUndefined } from "../../../shared-util/assert"
import { projectService, setServer, setTSState, ts, typeRefStatement } from "./state"
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

                const ori = info.project.projectService.openClientFile
                info.project.projectService.openClientFile = fileName => {
                    console.log(fileName)
                    return ori.call(info.project.projectService, fileName)
                }
            }
            return Object.assign({}, info.languageService)
        },

        onConfigurationChanged(params: {
            sockPath: string
            triggerFileName: string
            configurations: QingkuaiConfigurationWithDir[]
        }) {
            initQingkuaiConfig(params.configurations)

            if (!isEmptyString(params.triggerFileName)) {
                projectService.closeClientFile(params.triggerFileName)
            }

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
