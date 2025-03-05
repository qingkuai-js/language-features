import type TS from "typescript"
import type { DocumentSpan, SymbolDisplayPart } from "typescript"

import path from "path"
import { projectService, ts } from "../state"
import { isString, isUndefined } from "../../../../shared-util/assert"

export function isEventType(type: TS.Type) {
    if (type.isClass()) {
        return false
    }
    return !!(type.getCallSignatures().length || type.symbol?.name === "Function")
}

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

// 将SymbolDisplayPart[]类型转换为带有链接的markdown纯文本
export function convertDisplayPartsToPlainTextWithLink(parts: SymbolDisplayPart[] | undefined) {
    if (isUndefined(parts)) {
        return ""
    }

    return parts.reduce((ret, part) => {
        if (part.kind === "linkText") {
            let spaceIndex = part.text.indexOf(" ")
            if (spaceIndex === -1) {
                spaceIndex = part.text.length
            }
            return ret + `[${part.text.slice(spaceIndex)}](${part.text.slice(0, spaceIndex)})`
        } else if (part.kind === "linkName") {
            const target: DocumentSpan = (part as any).target
            const args = encodeURIComponent(
                JSON.stringify({
                    path: target.fileName,
                    end: target.textSpan.start,
                    start: target.textSpan.start
                })
            )
            return ret + `[${part.text}](command:qingkuai.openFileByFilePath?${args})`
        }
        return ret + (part.kind === "link" ? "" : part.text)
    }, "")
}
