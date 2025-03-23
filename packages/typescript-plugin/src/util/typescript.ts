import type TS from "typescript"

import path from "node:path"
import { getRealPath } from "./qingkuai"
import { excludeProperty } from "../../../../shared-util/sundry"
import { openQingkuaiFiles, projectService, ts } from "../state"
import { isString, isUndefined } from "../../../../shared-util/assert"

export function pathToFileName(p: TS.Path) {
    return projectService.getScriptInfo(p)?.fileName || ""
}

export function isEventType(type: TS.Type) {
    if (type.isClass()) {
        return false
    }
    if (type.isUnion()) {
        return type.types.some(isEventType)
    }
    return !!(type.getCallSignatures().length || type.symbol?.name === "Function")
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

export function getProgramByProject(project: TS.server.Project) {
    return project.getLanguageService().getProgram()
}

export function isFileOpening(fileName: string) {
    return (
        openQingkuaiFiles.has(getRealPath(fileName)) ||
        projectService.openFiles.has(projectService.toPath(fileName))
    )
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

export function forEachProject(cb: (p: TS.server.Project) => void) {
    // @ts-expect-error: access private method
    projectService.forEachProject(cb)
}

// 从指定节点中查找指定位置的节点（深度优先遍历）
export function getNodeAt(node: TS.Node, pos: number): TS.Node | undefined {
    const [start, len] = [node.getStart(), node.getWidth()]
    if (pos >= start && pos <= start + len) {
        for (const child of node.getChildren()) {
            const foundInChild = getNodeAt(child, pos)
            if (foundInChild) {
                return foundInChild
            }
        }
        return node
    }
    return undefined
}

export function getUserPreferencesByFileName(fileName: string): TS.UserPreferences {
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

export function getFormatCodeSettingsByFileName(fileName: string) {
    return projectService.getFormatCodeOptions(ts.server.toNormalizedPath(fileName))
}

export function convertJsDocTagsToMarkdown(tags: TS.JSDocTagInfo[]) {
    tags.map(tag => {
        switch (tag.name) {
            case "augments":
            case "extends":
            case "param":
            case "template": {
                const body = getTagBody(tag)
                if (body?.length === 3) {
                    const param = body[1]
                    const doc = body[2]
                    const label = `*@${tag.name}* \`${param}\``
                    if (!doc) {
                        return label
                    }
                    return label + (doc.match(/\r\n|\n/g) ? "  \n" + doc : ` \u2014 ${doc}`)
                }
                break
            }
            case "return":
            case "returns": {
                // For return(s), we require a non-empty body
                if (!tag.text?.length) {
                    return undefined
                }

                break
            }
        }

        // Generic tag
        const label = `*@${tag.name}*`
        const text = getTagBodyText(tag)
        if (!text) {
            return label
        }
        return label + (text.match(/\r\n|\n/g) ? "  \n" + text : ` \u2014 ${text}`)
    })
}

// 将SymbolDisplayPart[]类型转换为带有链接的markdown纯文本
export function convertDisplayPartsToPlainTextWithLink(parts: TS.SymbolDisplayPart[] | undefined) {
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
            const target: TS.DocumentSpan = (part as any).target
            const args = encodeURIComponent(
                JSON.stringify({
                    end: target.textSpan.start,
                    start: target.textSpan.start,
                    path: getRealPath(target.fileName)
                })
            )
            return ret + `[${part.text}](command:qingkuai.openFileByFilePath?${args})`
        }
        return ret + (part.kind === "link" ? "" : part.text || "")
    }, "")
}

function getTagBodyText(tag: TS.JSDocTagInfo): string | undefined {
    if (!tag.text) {
        return undefined
    }

    function makeCodeblock(text: string): string {
        if (/^\s*[~`]{3}/m.test(text)) {
            return text
        }
        return "```\n" + text + "\n```"
    }

    let text = convertDisplayPartsToPlainTextWithLink(tag.text)
    switch (tag.name) {
        case "example": {
            const captionTagMatches = text.match(/<caption>(.*?)<\/caption>\s*(\r\n|\n)/)
            if (captionTagMatches && captionTagMatches.index === 0) {
                return (
                    captionTagMatches[1] +
                    "\n" +
                    makeCodeblock(text.slice(captionTagMatches[0].length))
                )
            } else {
                return makeCodeblock(text)
            }
        }
        case "author": {
            const emailMatch = text.match(/(.+)\s<([-.\w]+@[-.\w]+)>/)
            if (emailMatch === null) {
                return text
            } else {
                return `${emailMatch[1]} ${emailMatch[2]}`
            }
        }
        case "default": {
            return makeCodeblock(text)
        }
        default: {
            return text
        }
    }
}

function getTagBody(tag: TS.JSDocTagInfo): Array<string> | undefined {
    if (tag.name === "template") {
        const parts = tag.text
        if (parts && typeof parts !== "string") {
            const docs = parts.filter(p => p.kind === "text")
            const docsText = docs.map(p => p.text.replace(/^\s*-?\s*/, "")).join(" ")
            const params = parts.filter(p => p.kind === "typeParameterName")
            const paramsText = params.map(p => p.text).join(", ")

            return params ? ["", paramsText, docsText] : undefined
        }
    }
    return convertDisplayPartsToPlainTextWithLink(tag.text).split(/^(\S+)\s*-?\s*/)
}
