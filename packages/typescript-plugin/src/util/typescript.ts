import type TS from "typescript"

import path from "node:path"
import { isString } from "../../../../shared-util/assert"
import { qkContext } from "qingkuai-language-service/adapters"
import { excludeProperty } from "../../../../shared-util/sundry"
import { openQingkuaiFiles, projectService, ts } from "../state"

export function pathToFileName(p: TS.Path) {
    return projectService.getScriptInfo(p)?.fileName || ""
}

// 获取引用指定文件的文件名列表
export function getFileReferences(
    fileName: string,
    options?: {
        recursive?: boolean
        justOpening?: boolean
    }
) {
    const referenceFileNames = new Set<string>()
    forEachProject((project: TS.server.Project) => {
        const languageService = project.getLanguageService()
        languageService.getFileReferences(fileName).forEach(entry => {
            if (!options?.justOpening || isFileOpening(entry.fileName)) {
                referenceFileNames.add(entry.fileName)
            }
            if (options?.recursive) {
                getFileReferences(entry.fileName).forEach(item => {
                    referenceFileNames.add(item)
                })
            }
        })
    })
    return Array.from(referenceFileNames)
}

export function getProjectDirectory(project: TS.server.Project) {
    const compilerOptions = project.getCompilerOptions()
    if (!isString(compilerOptions.configFilePath)) {
        return project.getCurrentDirectory()
    } else {
        return path.dirname(compilerOptions.configFilePath)
    }
}

export function forEachProject(cb: (p: TS.server.Project) => void) {
    // @ts-expect-error: access private method
    projectService.forEachProject(cb)
}

export function getUserPreferences(fileName: string): TS.UserPreferences {
    const userPreferences = excludeProperty(
        projectService.getPreferences(ts.server.toNormalizedPath(fileName)),
        "lazyConfiguredProjectsFromExternalProject"
    )
    return {
        ...userPreferences,
        includeCompletionsWithInsertText: true,
        includeCompletionsForModuleExports: true
    }
}

export function getFormattingOptions(fileName: string) {
    return projectService.getFormatCodeOptions(ts.server.toNormalizedPath(fileName))
}

export function getProgramByProject(project: TS.server.Project) {
    return project.getLanguageService().getProgram()
}

export function isFileOpening(fileName: string) {
    return (
        openQingkuaiFiles.has(qkContext.getRealPath(fileName)) ||
        projectService.openFiles.has(projectService.toPath(fileName))
    )
}

export function getContainingProjects(fileName: string) {
    return projectService.getScriptInfo(fileName)?.containingProjects || []
}

export function getDefaultProgram(fileName: string) {
    return getDefaultLanguageService(fileName)?.getProgram()
}

export function getDefaultLanguageService(fileName: string) {
    return getDefaultProject(fileName)?.getLanguageService()
}

export function getDefaultProject(fileName: string) {
    return projectService.getDefaultProjectForFile(ts.server.toNormalizedPath(fileName), true)
}

export function getDefaultSourceFile(fileName: string): TS.SourceFile | undefined
export function getDefaultSourceFile(info: TS.server.ScriptInfo): TS.SourceFile | undefined
export function getDefaultSourceFile(by: string | TS.server.ScriptInfo): TS.SourceFile | undefined {
    if (isString(by)) {
        return getDefaultProgram(by)?.getSourceFile(by)
    }
    return by.getDefaultProject().getSourceFile(projectService.toPath(by.fileName))
}
