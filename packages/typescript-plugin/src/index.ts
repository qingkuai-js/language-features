import type TS from "typescript"

import type { ConfigPluginParms } from "../../../types/communication"
import type { CompileIntermidiateFunc } from "qingkuai-language-service"
import type { QingkuaiFileInfo } from "qingkuai-language-service/adapters"

import nodeFs from "node:fs"

import { proxyTypescript } from "./proxy"
import { ts, setState, adapter, Logger } from "./state"
import { compileIntermediate } from "qingkuai/compiler"
import { isUndefined } from "../../../shared-util/assert"
import { attachLanguageServerIPCHandlers } from "./server"
import { excludeProperty } from "../../../shared-util/sundry"
import { createConfigResolver } from "qingkuai-language-service"
import { createServer } from "../../../shared-util/ipc/participant"
import { TypescriptAdapter } from "qingkuai-language-service/adapters"
import { ADAPTER_FS, ADAPTER_PATH } from "../../../shared-util/constant"
import { getQingkuaiConfig, setQingkuaiConfig } from "./server/configuration/method"

export = function init(modules: { typescript: typeof TS }) {
    return {
        create(info: TS.server.PluginCreateInfo) {
            const project = info.project
            const projectService = project.projectService
            proxyTypescript(info)

            if (isUndefined(ts)) {
                setState({
                    ts: modules.typescript,
                    projectService: info.project.projectService,
                    adapter: createAdapter(modules.typescript, projectService)
                })
                info.project.projectService.setHostConfiguration({
                    extraFileExtensions: [
                        {
                            extension: ".qk",
                            isMixedContent: false,
                            scriptKind: modules.typescript.ScriptKind.Deferred
                        },

                        // @ts-expect-error: access private property
                        ...info.project.projectService.extraFileExtensions
                    ]
                })
            }
            return info.languageService
        },

        onConfigurationChanged(params: ConfigPluginParms) {
            createIpcServer(params.sockPath, params.warmupFilePath)
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
            const qingkuaiConfigResolver = createConfigResolver(ADAPTER_FS, ADAPTER_PATH)
            for (const fileName of parsed.fileNames) {
                setQingkuaiConfig(fileName, {
                    hoverTipReactiveStatus: true,
                    ...qingkuaiConfigResolver.resolve(fileName)
                })
            }
            return parsed.fileNames
        }
    }
}

// 创建ipc通道，并监听来自 qingkuai 语言服务器的请求
function createIpcServer(sockPath: string, warmupFilePath?: string) {
    if (!nodeFs.existsSync(sockPath)) {
        createServer(sockPath).then(
            server => {
                setState({
                    server
                })
                attachLanguageServerIPCHandlers()

                if (warmupFilePath) {
                    cleanupWarmupFile(warmupFilePath)
                }
            },
            err => {
                Logger.error(createIpcServer.name, err)
            }
        )
    }
}

function cleanupWarmupFile(warmupFilePath: string) {
    try {
        const ps = adapter.projectService as any
        const rootSet = ps.rootOfInferredProjects
        const canonicalPath = ps.toPath(warmupFilePath)
        if (rootSet) {
            for (const info of rootSet) {
                if (info.fileName === warmupFilePath || info.path === canonicalPath) {
                    rootSet.delete(info)
                    break
                }
            }
        }

        // 清理缓存中的 watcher：使用规范化路径匹配
        ps.configFileExistenceInfoCache?.forEach?.((info: any, key: string) => {
            const hasFile = info.openFilesImpactedByConfigFile?.has?.(canonicalPath)
            if (hasFile) info.openFilesImpactedByConfigFile.delete(canonicalPath)
            if (info.watcher && !info.openFilesImpactedByConfigFile?.size && !info.config) {
                info.watcher.close()
                ps.configFileExistenceInfoCache.delete(key)
            }
        })
    } catch {
        // do nothing
    }
}

function createAdapter(ts: typeof TS, projectService: TS.server.ProjectService) {
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

    const compile: CompileIntermidiateFunc = path => {
        return compileIntermediate(adapter.fs.read(path))
    }

    return new TypescriptAdapter(
        ts,
        Logger,
        ADAPTER_FS,
        ADAPTER_PATH,
        compile,
        projectService,
        getQingkuaiConfig,
        updateContent,
        getUserPreferences,
        getFormattingOptions
    )
}
