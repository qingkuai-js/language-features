import type TS from "typescript"
import type { QingKuaiSnapShot } from "../snapshot"

import { existsSync } from "node:fs"
import { projectService, ts } from "../state"
import { HAS_BEEN_PROXIED_BY_QINGKUAI } from "../constant"
import { ensureGetSnapshotOfQingkuaiFile } from "../util/qingkuai"
import { proxies, qkContext } from "qingkuai-language-service/adapters"
import { initialEditQingkuaiFileSnapshot } from "../server/content/method"
import { isQingkuaiFileName, isUndefined } from "../../../../shared-util/assert"

export function proxyGetScriptKind(languageServiceHost: TS.LanguageServiceHost) {
    const getScriptKind = languageServiceHost.getScriptKind?.bind(languageServiceHost)
    if (isUndefined(getScriptKind)) {
        return
    }
    languageServiceHost.getScriptKind = fileName => {
        if (!isQingkuaiFileName(fileName)) {
            return getScriptKind(fileName)
        }
        return ensureGetSnapshotOfQingkuaiFile(qkContext.getRealPath(fileName)).scriptKind
    }
}

export function proxyGetCompletionsAtPosition(languageService: TS.LanguageService) {
    proxies.proxyGetCompletionsAtPosition(languageService)
}

export function proxyGetScriptVersion(languageServiceHost: TS.LanguageServiceHost) {
    const getScriptVersion = languageServiceHost.getScriptVersion
    languageServiceHost.getScriptVersion = fileName => {
        if (!isQingkuaiFileName(fileName)) {
            return getScriptVersion.call(languageServiceHost, fileName)
        }
        return ensureGetSnapshotOfQingkuaiFile(qkContext.getRealPath(fileName)).version.toString()
    }
}

export function proxyGetScriptSnapshot(project: TS.server.Project) {
    const getScriptSnapshot = project.getScriptSnapshot
    project.getScriptSnapshot = fileName => {
        if (!isQingkuaiFileName(fileName)) {
            return getScriptSnapshot.call(project, fileName)
        }

        if (!existsSync(qkContext.getRealPath(fileName))) {
            return undefined
        }

        const scriptInfo = projectService.getOrCreateScriptInfoForNormalizedPath(
            ts.server.toNormalizedPath(fileName),
            false
        )
        scriptInfo?.attachToProject(project)

        const realPath = qkContext.getRealPath(fileName)
        initialEditQingkuaiFileSnapshot(realPath)
        return ensureGetSnapshotOfQingkuaiFile(realPath)
    }
}

export function proxyResolveModuleNameLiterals(languageServiceHost: TS.LanguageServiceHost) {
    const resolveModuleLiterals = languageServiceHost.resolveModuleNameLiterals
    if (isUndefined(resolveModuleLiterals)) {
        return
    }
    proxies.proxyResolveModuleNameLiterals(languageServiceHost, modulePath => {
        const snapshot = languageServiceHost.getScriptSnapshot(modulePath) as QingKuaiSnapShot
        const compilationSettings = languageServiceHost.getCompilationSettings()
        return snapshot.scriptKind === ts.ScriptKind.TS || !!compilationSettings.allowJs
    })
}

// 在getMoveToRefactoringFileSuggestions执行期间过滤掉program.getSourceFiles结果中的qingkuai文件
export function proxyGetMoveToRefactoringFileSuggestions(languageService: TS.LanguageService) {
    let getMoveToRefactoringFileSuggestionsIsRunning = false
    const { getMoveToRefactoringFileSuggestions } = languageService
    languageService.getMoveToRefactoringFileSuggestions = (...args) => {
        const program = languageService.getProgram()
        program && proxyGetSourceFiles(program)
        getMoveToRefactoringFileSuggestionsIsRunning = true

        const originalRet = getMoveToRefactoringFileSuggestions.call(languageService, ...args)
        return (getMoveToRefactoringFileSuggestionsIsRunning = false), originalRet
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
        ;(getSourceFiles as any)[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
    }
}
