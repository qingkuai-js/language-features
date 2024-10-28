import type TS from "typescript"

import {
    ts,
    setTS,
    project,
    setProject,
    languageService,
    setProjectService,
    setLanguageService,
    languageServiceHost,
    setLanguageServerHost,
    setLanguageServiceHost,
    setServer
} from "./state"
import fs from "fs"
import path from "path"
import { nextTick } from "process"
import { QingKuaiSnapShot } from "./snapshot"
import { isUndefined } from "../../../shared-util/assert"
import { getSockPath } from "../../../shared-util/ipc/sock"
import { createServer } from "../../../shared-util/ipc/server"

export = function init(modules: { typescript: typeof TS }) {
    setTS(modules.typescript)

    // 如果名称为qingkuai的套接字/命名管道文件已经存在则移除它
    const sockPath = getSockPath("qingkuai")
    fs.existsSync(sockPath) && fs.rmSync(sockPath)

    // 创建ipc通道，并监听来自qingkuai语言服务器的请求
    createServer("qingkuai").then(server => {
        setServer(server)
    })

    function create(info: TS.server.PluginCreateInfo) {
        // 提升vscode内置的typescript语言服务到外部，qk文件将交由此服务处理
        setProject(info.project)
        setLanguageServerHost(info.serverHost)
        setLanguageService(info.languageService)
        setProjectService(project.projectService)
        setLanguageServiceHost(info.languageServiceHost)

        // 代理typescript语言服务的原始方法
        proxyGetScriptSnapshot()
        proxyResolveModuleNameLiterals()

        return nextTick(initialized), Object.assign({}, languageService)
    }

    return { create }
}

function initialized() {
    // const activeByQingKuai = project.getFileNames().some(fileName => {
    //     return fileName.endsWith(".qk")
    // })
    // if (activeByQingKuai) {
    //     tsLogger.info(
    //         "Typescript-QingKuai-Plugin: Typescript language service is actived by a qingkuai sourcefile."
    //     )
    // } else {
    // }
}

function proxyGetScriptSnapshot() {
    const ori = languageServiceHost.getScriptSnapshot
    languageServiceHost.getScriptSnapshot = fileName => {
        let ret = ori.call(languageServiceHost, fileName)
        if (fileName.endsWith(".qk")) {
            ret = new QingKuaiSnapShot(ret?.getText(0, ret?.getLength()) || "")
        }
        return ret
    }
}

function proxyResolveModuleNameLiterals() {
    const ori = languageServiceHost.resolveModuleNameLiterals
    if (!isUndefined(ori)) {
        languageServiceHost.resolveModuleNameLiterals = (moduleLiterals, ...rest) => {
            const ret = ori.call(languageServiceHost, moduleLiterals, ...rest)
            const fileName = rest[3].fileName
            ret.forEach((item, index) => {
                const literal = moduleLiterals[index]
                if (literal.text.endsWith(".qk")) {
                    Object.assign(item, {
                        resolvedModule: {
                            packageId: undefined,
                            originalPath: undefined,
                            extension: ts.Extension.Ts,
                            resolvedUsingTsExtension: true,
                            isExternalLibraryImport: false,
                            resolvedFileName: path.resolve(fileName, "../", literal.text)
                        },
                        failedLookupLocations: undefined
                    })
                }
            })
            return ret
        }
    }
}
