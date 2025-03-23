import type TS from "typescript"
import type { QingKuaiSnapShot } from "../snapshot"

import { existsSync } from "node:fs"
import { dirname, extname, resolve } from "node:path"
import { HAS_BEEN_PROXIED_BY_QINGKUAI } from "../constant"
import { getConfigByFileName } from "../server/configuration/method"
import { projectService, resolvedQingkuaiModule, ts } from "../state"
import { initialEditQingkuaiFileSnapshot } from "../server/content/method"
import { ensureGetSnapshotOfQingkuaiFile, getRealPath } from "../util/qingkuai"
import { isEmptyString, isQingkuaiFileName, isUndefined } from "../../../../shared-util/assert"

export function proxyGetScriptKind(languageServiceHost: TS.LanguageServiceHost) {
    const getScriptKind = languageServiceHost.getScriptKind?.bind(languageServiceHost)
    if (isUndefined(getScriptKind) || (getScriptKind as any)[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }

    languageServiceHost.getScriptKind = fileName => {
        if (!isQingkuaiFileName(fileName)) {
            return getScriptKind(fileName)
        }
        return ensureGetSnapshotOfQingkuaiFile(getRealPath(fileName)).scriptKind
    }

    // @ts-expect-error: attach supplementary property
    languageServiceHost.getScriptKind[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}

export function proxyGetScriptVersion(languageServiceHost: TS.LanguageServiceHost) {
    const getScriptVersion = languageServiceHost.getScriptVersion
    if ((getScriptVersion as any)[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }

    languageServiceHost.getScriptVersion = fileName => {
        if (!isQingkuaiFileName(fileName)) {
            return getScriptVersion.call(languageServiceHost, fileName)
        }
        return ensureGetSnapshotOfQingkuaiFile(getRealPath(fileName)).version.toString()
    }

    // @ts-expect-error: attach supplementary property
    languageServiceHost.getScriptVersion[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}

export function proxyGetScriptSnapshot(project: TS.server.Project) {
    const getScriptSnapshot = project.getScriptSnapshot
    if ((getScriptSnapshot as any)[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }

    project.getScriptSnapshot = fileName => {
        if (!isQingkuaiFileName(fileName)) {
            return getScriptSnapshot.call(project, fileName)
        }

        if (!existsSync(getRealPath(fileName))) {
            return undefined
        }

        const scriptInfo = projectService.getOrCreateScriptInfoForNormalizedPath(
            ts.server.toNormalizedPath(fileName),
            false
        )
        scriptInfo?.attachToProject(project)

        const realPath = getRealPath(fileName)
        initialEditQingkuaiFileSnapshot(realPath)
        return ensureGetSnapshotOfQingkuaiFile(realPath)
    }

    // @ts-expect-error: attach supplementary property
    project.getScriptSnapshot[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}

export function proxyResolveModuleNameLiterals(languageServiceHost: TS.LanguageServiceHost) {
    const resolveModuleLiterals = languageServiceHost.resolveModuleNameLiterals

    if (
        isUndefined(resolveModuleLiterals) ||
        // @ts-expect-error: access supplementary property
        languageServiceHost.resolveModuleNameLiterals[HAS_BEEN_PROXIED_BY_QINGKUAI]
    ) {
        return
    }

    languageServiceHost.resolveModuleNameLiterals = (moduleLiterals, containingFile, ...rest) => {
        const containingFileRealPath = getRealPath(containingFile)
        const originalRet = resolveModuleLiterals.call(
            languageServiceHost,
            moduleLiterals,
            containingFile,
            ...rest
        )
        const qingkuaiModules = new Set<string>()
        const curDir = dirname(containingFileRealPath)
        const config = getConfigByFileName(containingFileRealPath)

        const ret = originalRet.map((item, index) => {
            const moduleText = moduleLiterals[index].text
            const isDirectory = isEmptyString(extname(moduleText))
            const resolveAsQk = isDirectory && config.resolveImportExtension
            const modulePath = resolve(curDir, moduleText + (resolveAsQk ? ".qk" : ""))

            // 导入项非qingkuai文件，返回原始值
            if (!isQingkuaiFileName(modulePath)) {
                return item
            }

            // 导入项目为qingkuai文件，但文件不存在，修改failedLooupLocations
            if (!existsSync(modulePath)) {
                return {
                    ...item,
                    failedLookupLocations: [modulePath]
                }
            }

            const snapshot = languageServiceHost.getScriptSnapshot(modulePath) as QingKuaiSnapShot
            const compilationSettings = languageServiceHost.getCompilationSettings()
            const isTS = snapshot.scriptKind === ts.ScriptKind.TS
            if (!isTS && !compilationSettings.allowJs) {
                return item
            }
            qingkuaiModules!.add(moduleText)
            return {
                ...item,
                resolvedModule: {
                    isExternalLibraryImport: false,
                    resolvedUsingTsExtension: false,
                    extension: isTS ? ".ts" : ".js",
                    resolvedFileName: ts.server.toNormalizedPath(modulePath)
                },
                failedLookupLocations: undefined
            }
        })
        if (qingkuaiModules.size) {
            resolvedQingkuaiModule.set(containingFileRealPath, qingkuaiModules)
        }
        return ret
    }

    // @ts-expect-error: attach supplementary property
    languageServiceHost.resolveModuleNameLiterals[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}

// 在getMoveToRefactoringFileSuggestions执行期间过滤掉program.getSourceFiles结果中的qingkuai文件
export function proxyGetMoveToRefactoringFileSuggestions(languageService: TS.LanguageService) {
    let getMoveToRefactoringFileSuggestionsIsRunning = false
    const { getMoveToRefactoringFileSuggestions } = languageService
    if ((getMoveToRefactoringFileSuggestions as any)[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }

    function proxyGetSourceFiles(program: TS.Program) {
        const getSourceFiles = program.getSourceFiles.bind(program)
        if ((getSourceFiles as any)[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
            return
        }
        program.getSourceFiles = () => {
            const originalRet = getSourceFiles!()
            if (!getMoveToRefactoringFileSuggestionsIsRunning) {
                return originalRet
            }
            return originalRet.filter(item => !isQingkuaiFileName(item.fileName))
        }
        ;(program as any)[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
    }

    languageService.getMoveToRefactoringFileSuggestions = (...args) => {
        const program = languageService.getProgram()
        program && proxyGetSourceFiles(program)
        getMoveToRefactoringFileSuggestionsIsRunning = true

        const originalRet = getMoveToRefactoringFileSuggestions.call(languageService, ...args)
        return (getMoveToRefactoringFileSuggestionsIsRunning = false), originalRet
    }

    // @ts-expect-error: attach supplementary property
    languageService.getMoveToRefactoringFileSuggestions[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}
