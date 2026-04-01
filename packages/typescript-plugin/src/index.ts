import type TS from "typescript"

import type { ConfigPluginParms } from "../../../types/communication"
import type { QingkuaiFileInfo } from "qingkuai-language-service/adapters"

import nodeFs from "node:fs"
import nodePath from "node:path"

import { proxyTypescript } from "./proxy"
import { ts, setState, adapter } from "./state"
import { isUndefined } from "../../../shared-util/assert"
import { attachLanguageServerIPCHandlers } from "./server"
import { AdapterFS, AdapterPath } from "../../../types/common"
import { createServer } from "../../../shared-util/ipc/participant"
import { TypescriptAdapter } from "qingkuai-language-service/adapters"
import { excludeProperty, traverseObject } from "../../../shared-util/sundry"
import { getQingkuaiConfig, setQingkuaiConfig } from "./server/configuration/method"

export = function init(modules: { typescript: typeof TS }) {
    return {
        create(info: TS.server.PluginCreateInfo) {
            const project = info.project
            const projectService = project.projectService
            if (isUndefined(ts)) {
                setState({
                    ts: modules.typescript,
                    projectService: info.project.projectService,
                    adapter: createAdapter(modules.typescript, projectService)
                })
                // info.project.projectService.setHostConfiguration({
                //     extraFileExtensions: [
                //         {
                //             extension: ".qk",
                //             isMixedContent: false,
                //             scriptKind: modules.typescript.ScriptKind.Deferred
                //         }
                //     ]
                // })
            }
            proxyTypescript(info)
            return info.languageService
        },

        onConfigurationChanged(params: ConfigPluginParms) {
            traverseObject(params.configurations, (fileName, config) => {
                setQingkuaiConfig(fileName, config)
            })
            createIpcServer(params.sockPath)
        },

        getExternalFiles(project: TS.server.Project, updateLevel: TS.ProgramUpdateLevel) {
            if (
                updateLevel === ts.ProgramUpdateLevel.Update ||
                project.projectKind !== ts.server.ProjectKind.Configured
            ) {
                return []
            }

            const config = ts.readJsonConfigFile(
                project.getProjectName(),
                project.readFile.bind(project)
            )
            const parseHost: TS.ParseConfigHost = {
                fileExists(path) {
                    return project.fileExists(path)
                },
                readFile(path) {
                    return project.readFile(path)
                },
                readDirectory(...args) {
                    args[1] = [".qk"]
                    return project.readDirectory(...args)
                },
                get useCaseSensitiveFileNames() {
                    return project.useCaseSensitiveFileNames()
                }
            }
            const parsed = ts.parseJsonSourceFileConfigFileContent(
                config,
                parseHost,
                project.getCurrentDirectory()
            )
            return parsed.fileNames
        }
    }
}

// 创建ipc通道，并监听来自 qingkuai 语言服务器的请求
function createIpcServer(sockPath: string) {
    if (!nodeFs.existsSync(sockPath)) {
        createServer(sockPath).then(server => {
            setState({
                server
            })
            attachLanguageServerIPCHandlers()
        })
    }
}

function createAdapter(ts: typeof TS, projectService: TS.server.ProjectService) {
    const typeDecFilePath = nodePath.resolve(__dirname, "../dts/qingkuai")

    const adapterFs: AdapterFS = {
        exist: nodeFs.existsSync,
        read: path => nodeFs.readFileSync(path, "utf-8")
    }

    const getUserPreferences = (fileName: string): TS.UserPreferences => {
        const ret = excludeProperty(
            projectService.getPreferences(adapter.getNormalizedPath(fileName)),
            "lazyConfiguredProjectsFromExternalProject"
        )
        if (adapter.getQingkuaiConfig(fileName)?.resolveImportExtension) {
            return {
                ...ret,
                importModuleSpecifierEnding: "js"
            }
        }
        return ret
    }

    const updateContent = (fileInfo: QingkuaiFileInfo, content: string) => {
        adapter.markProjectsAsDirty()
        fileInfo.version++
        fileInfo.code = content
    }

    const getFormattingOptions = (fileName: string) => {
        return projectService.getFormatCodeOptions(adapter.getNormalizedPath(fileName))
    }

    const adapterPath: AdapterPath = {
        ext(path: string) {
            return nodePath.extname(path)
        },
        dir(path: string) {
            return nodePath.dirname(path)
        },
        resolve(...paths: string[]) {
            return nodePath.resolve(...paths)
        },
        relative(from: string, to: string) {
            return nodePath.relative(from, to)
        },
        base(path: string) {
            return nodePath.basename(path, nodePath.extname(path))
        }
    }

    return new TypescriptAdapter(
        ts,
        adapterFs,
        adapterPath,
        typeDecFilePath,
        projectService,
        getQingkuaiConfig,
        updateContent,
        getUserPreferences,
        getFormattingOptions
    )
}
