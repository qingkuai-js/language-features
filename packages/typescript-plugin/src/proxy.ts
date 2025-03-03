import type TS from "typescript"
import type { TSPluginCreateInfo } from "./types"

import {
    ts,
    projectService,
    resolvedQingkuaiModule,
    triggerQingkuaiFileName,
    setTriggerQingkuaiFileName
} from "./state"
import fs from "fs"
import path from "path"
import { runAll } from "../../../shared-util/sundry"
import { refreshDiagnostics } from "./server/diagnostic/refresh"
import { getConfigByFileName } from "./server/configuration/method"
import { isEmptyString, isUndefined } from "../../../shared-util/assert"
import { ensureGetSnapshotOfQingkuaiFile, isQingkuaiFileName } from "./util/qingkuai"

export function proxyTypescriptProjectServiceMethods() {
    runAll([
        proxyCloseClientFile,
        proxyOnConfigFileChanged,
        proxyGetOrCreateScriptInfoForNormalizedPath,
        proxyUpdateRootAndOptionsOfNonInferredProject
    ])
}

export function proxyTypescriptLanguageServiceMethods(info: TSPluginCreateInfo) {
    const { project, languageServiceHost } = info
    runAll([
        () => proxyGetScriptKind(languageServiceHost),
        () => proxyGetScriptVersion(languageServiceHost),
        () => proxyResolveModuleNameLiterals(languageServiceHost),
        () => proxyGetScriptSnapshot(project, languageServiceHost)
    ])
}

function proxyCloseClientFile() {
    const closeClientFile = projectService.closeClientFile

    projectService.closeClientFile = fileName => {
        if (fileName === triggerQingkuaiFileName) {
            return setTriggerQingkuaiFileName(""), false
        }

        return closeClientFile.call(projectService, fileName)
    }
}

function proxyGetScriptKind(languageServiceHost: TS.LanguageServiceHost) {
    const getScriptKind = languageServiceHost.getScriptKind

    if (isUndefined(getScriptKind)) {
        return
    }

    languageServiceHost.getScriptKind = fileName => {
        if (!isQingkuaiFileName(fileName)) {
            return getScriptKind.call(languageServiceHost, fileName)
        }

        return ensureGetSnapshotOfQingkuaiFile(fileName).scriptKind
    }
}

function proxyGetScriptVersion(languageServiceHost: TS.LanguageServiceHost) {
    const getScriptVersion = languageServiceHost.getScriptVersion

    languageServiceHost.getScriptVersion = fileName => {
        if (!isQingkuaiFileName(fileName)) {
            return getScriptVersion.call(languageServiceHost, fileName)
        }

        return ensureGetSnapshotOfQingkuaiFile(fileName).version.toString()
    }
}

function proxyOnConfigFileChanged() {
    const projectServiceAsAny = projectService as any
    const onConfigFileChanged = projectServiceAsAny.onConfigFileChanged

    projectServiceAsAny.onConfigFileChanged = (...args: any) => {
        setTimeout(() => {
            refreshDiagnostics("///ts", false)
        }, 2500)

        return onConfigFileChanged.bind(projectService, ...args)
    }
}

function proxyGetScriptSnapshot(
    project: TS.server.Project,
    languageServiceHost: TS.LanguageServiceHost
) {
    const getScriptSnapshot = project.getScriptSnapshot.bind(project)

    project.getScriptSnapshot = fileName => {
        if (!isQingkuaiFileName(fileName)) {
            return getScriptSnapshot(fileName)
        }

        if (!languageServiceHost.fileExists(fileName)) {
            return undefined
        }

        if (!projectService.getScriptInfo(fileName)) {
            const scriptInfo = projectService.getOrCreateScriptInfoForNormalizedPath(
                ts.server.toNormalizedPath(fileName),
                false
            )
            scriptInfo?.attachToProject(project)
        }

        return ensureGetSnapshotOfQingkuaiFile(fileName)
    }
}

function proxyGetOrCreateScriptInfoForNormalizedPath() {
    const { getOrCreateScriptInfoForNormalizedPath } = projectService

    projectService.getOrCreateScriptInfoForNormalizedPath = (fileName, ...rest) => {
        const originalRet = getOrCreateScriptInfoForNormalizedPath.call(
            projectService,
            fileName,
            ...rest
        )

        if (isUndefined(originalRet) || !isQingkuaiFileName(fileName)) {
            return originalRet
        }

        const originalSnapshotLen = originalRet.getSnapshot().getLength()
        const cachedQingkuaiSnapshot = ensureGetSnapshotOfQingkuaiFile(fileName)
        originalRet.editContent(0, originalSnapshotLen, cachedQingkuaiSnapshot.getFullText())

        // @ts-expect-error: change read-only property
        return (originalRet.scriptKind = cachedQingkuaiSnapshot.scriptKind), originalRet
    }
}

// 在typescript源码中的插件启用时机不正确，这里判断出这种情况不调用updateRootAndOptionsOfNonInferredProject
function proxyUpdateRootAndOptionsOfNonInferredProject() {
    const porjectServiceAny = projectService as any
    const oriMethod = porjectServiceAny.updateRootAndOptionsOfNonInferredProject
    porjectServiceAny.updateRootAndOptionsOfNonInferredProject = (project: any, ...rest: any) => {
        const existingPluginNames = new Set<string>()
        const isBug = project.plugins?.some(({ name }: any) => {
            if (existingPluginNames.has(name)) {
                return true
            }
            return existingPluginNames.add(name), false
        })
        !isBug && oriMethod.call(projectService, project, ...rest)
    }
}

function proxyResolveModuleNameLiterals(languageServiceHost: TS.LanguageServiceHost) {
    const resolveModuleLiterals = languageServiceHost.resolveModuleNameLiterals

    if (isUndefined(resolveModuleLiterals)) {
        return
    }

    languageServiceHost.resolveModuleNameLiterals = (moduleLiterals, containingFile, ...rest) => {
        const originalRet = resolveModuleLiterals.call(
            languageServiceHost,
            moduleLiterals,
            containingFile,
            ...rest
        )
        const curDir = path.dirname(containingFile)
        const config = getConfigByFileName(containingFile)

        return originalRet.map((item, index) => {
            const moduleText = moduleLiterals[index].text
            const isDirectory = isEmptyString(path.extname(moduleText))
            const resolveAsQk = isDirectory && config.resolveImportExtension

            const modulePath = path.resolve(curDir, `${moduleText}${resolveAsQk ? ".qk" : ""}`)
            if (!isQingkuaiFileName(modulePath) || !fs.existsSync(modulePath)) {
                return item
            }

            if (!resolvedQingkuaiModule.has(containingFile)) {
                resolvedQingkuaiModule.set(containingFile, new Set())
            }
            resolvedQingkuaiModule.get(containingFile)!.add(moduleText)

            const snapshot = ensureGetSnapshotOfQingkuaiFile(modulePath)
            const extension = snapshot.scriptKind === ts.ScriptKind.TS ? ".ts" : ".js"
            return {
                ...item,
                resolvedModule: {
                    extension,
                    resolvedFileName: modulePath,
                    isExternalLibraryImport: false,
                    resolvedUsingTsExtension: false
                },
                failedLookupLocations: undefined
            }
        })
    }
}
