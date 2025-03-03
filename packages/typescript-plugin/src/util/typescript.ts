import type TS from "typescript"

import path from "path"
import { projectService, ts } from "../state"
import { isString } from "../../../../shared-util/assert"

export function getProjectDirectory(project: TS.server.Project) {
    const compilerOptions = project.getCompilerOptions()
    if (!isString(compilerOptions.configFilePath)) {
        return project.getCurrentDirectory()
    } else {
        return path.dirname(compilerOptions.configFilePath)
    }
}

export function getProgramByProject(project: TS.server.Project) {
    return project.getLanguageService().getProgram()
}

export function isFileOpening(fileName: string) {
    return projectService.openFiles.has(projectService.toPath(fileName))
}

export function getContainingProjectsByFileName(fileName: string) {
    return projectService.getScriptInfo(fileName)?.containingProjects || []
}

export function getDefaultProgramByFileName(fileName: string) {
    return getDefaultLanguageServiceByFileName(fileName)?.getProgram()
}

export function getDefaultLanguageServiceByFileName(fileName: string) {
    return getDefaultProjectByFileName(fileName)?.getLanguageService()
}

export function getDefaultSourceFileByFileName(fileName: string) {
    return getDefaultProgramByFileName(fileName)?.getSourceFile(fileName)
}

export function getDefaultSourceFileByScriptInfo(info: TS.server.ScriptInfo) {
    return info.getDefaultProject().getSourceFile(projectService.toPath(info.fileName))
}

export function getDefaultProjectByFileName(fileName: string) {
    return projectService.getDefaultProjectForFile(ts.server.toNormalizedPath(fileName), true)
}
