import type TS from "typescript"
import type { TSPluginCreateInfo } from "./types"
import type { PositionFlagKeys } from "qingkuai/compiler"

import {
    getSourceIndex,
    isQingkuaiFileName,
    isPositionFlagSetBySourceIndex,
    ensureGetSnapshotOfQingkuaiFile
} from "./util/qingkuai"
import fs from "fs"
import path from "path"
import assert from "assert"
import { runAll } from "../../../shared-util/sundry"
import { HasBeenProxiedByQingKuai } from "./constant"
import { refreshDiagnostics } from "./server/diagnostic/refresh"
import { getDefaultSourceFileByFileName } from "./util/typescript"
import { getConfigByFileName } from "./server/configuration/method"
import { isEmptyString, isUndefined } from "../../../shared-util/assert"
import { initialEditQingkuaiFileSnapshot } from "./server/content/method"
import {
    ts,
    projectService,
    resolvedQingkuaiModule,
    openQingkuaiFiles,
    commandStatus
} from "./state"

export function proxyTypescriptProjectServiceAndSystemMethods() {
    runAll([
        proxyReadFile,
        proxyGetFileSize,
        proxyEditContent,
        proxyCloseClientFile,
        proxyOnConfigFileChanged,
        proxyUpdateRootAndOptionsOfNonInferredProject
    ])
}

export function proxyTypescriptLanguageServiceMethods(info: TSPluginCreateInfo) {
    const { project, languageServiceHost, session } = info
    runAll([
        () => proxyExecuteCommand(session),
        () => proxyGetScriptSnapshot(project),
        () => proxyRenameSessionHandler(session),
        () => proxyGetScriptKind(languageServiceHost),
        () => proxyGetScriptVersion(languageServiceHost),
        () => proxyResolveModuleNameLiterals(languageServiceHost)
    ])
}

function proxyGetFileSize() {
    const getFileSize = ts.sys.getFileSize
    if (!getFileSize) {
        return
    }
    ts.sys.getFileSize = path => {
        if (!isQingkuaiFileName(path)) {
            return getFileSize.call(ts.sys, path)
        }
        return ensureGetSnapshotOfQingkuaiFile(path).getLength()
    }
}

function proxyReadFile() {
    const readFile = ts.sys.readFile.bind(ts.sys)
    ts.sys.readFile = (fileName, encoding) => {
        if (!isQingkuaiFileName(fileName)) {
            return readFile(fileName, encoding)
        }
        return ensureGetSnapshotOfQingkuaiFile(fileName).getFullText()
    }
}

function proxyCloseClientFile() {
    const closeClientFile = projectService.closeClientFile
    projectService.closeClientFile = fileName => {
        if (openQingkuaiFiles.has(fileName)) {
            return
        }
        return closeClientFile.call(projectService, fileName)
    }
}

function proxyExecuteCommand(session: TS.server.Session | undefined) {
    if (isUndefined(session)) {
        return
    }

    const executeCommand = session.executeCommand
    session.executeCommand = request => {
        const originalRet = executeCommand.call(session, request)
        commandStatus.get(request.command)?.[1]()
        return originalRet
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

// 代理文件编辑，非qk文件修改时应刷新qk文件的诊断信息
function proxyEditContent() {
    const getScriptInfo = projectService.getScriptInfo.bind(projectService)
    projectService.getScriptInfo = fileName => {
        const scriptInfo = getScriptInfo(fileName)

        if (
            scriptInfo &&
            !isQingkuaiFileName(fileName) &&
            !(scriptInfo.editContent as any)[HasBeenProxiedByQingKuai]
        ) {
            const editContent = scriptInfo.editContent.bind(scriptInfo)
            scriptInfo.editContent = (start, end, newText) => {
                editContent(start, end, newText)

                // 确保不是其他qk文件修改时刷新诊断时导致的更改
                const snapshot = scriptInfo.getSnapshot()
                const contentLen = snapshot.getLength()
                if (
                    end !== contentLen ||
                    !(
                        (start === end && newText === " ") ||
                        (start === end - 1 && isEmptyString(newText))
                    )
                ) {
                    refreshDiagnostics(fileName, false)
                }
            }

            // @ts-expect-error: attach supplementary property
            scriptInfo.editContent[HasBeenProxiedByQingKuai] = true
        }

        return scriptInfo
    }
}

function proxyGetScriptSnapshot(project: TS.server.Project) {
    if ((project.getScriptSnapshot as any)[HasBeenProxiedByQingKuai]) {
        return
    }

    const getScriptSnapshot = project.getScriptSnapshot.bind(project)
    project.getScriptSnapshot = fileName => {
        if (!isQingkuaiFileName(fileName)) {
            return getScriptSnapshot(fileName)
        }

        if (!fs.existsSync(fileName)) {
            return undefined
        }

        const scriptInfo = projectService.getOrCreateScriptInfoForNormalizedPath(
            ts.server.toNormalizedPath(fileName),
            false
        )
        scriptInfo?.attachToProject(project)
        initialEditQingkuaiFileSnapshot(fileName)
        return ensureGetSnapshotOfQingkuaiFile(fileName)
    }

    // @ts-expect-error: attach supplementary property
    project.getScriptSnapshot[HasBeenProxiedByQingKuai] = true
}

function proxyRenameSessionHandler(session: TS.server.Session | undefined) {
    if (isUndefined(session)) {
        return
    }

    const sessionAny = session as any
    const originalHandler = sessionAny.handlers.get("rename")
    if (originalHandler[HasBeenProxiedByQingKuai]) {
        return
    }

    const proxiedHandler = (request: any) => {
        const originalRet = originalHandler(request)

        if (!originalRet?.response.locs.length) {
            return originalRet
        }

        const retLocs: any[] = []
        for (const { file, locs } of originalRet.response.locs) {
            if (!isQingkuaiFileName(file)) {
                retLocs.push({ file, locs })
                continue
            }

            const dealtLocs: any[] = []
            const sourceFile = getDefaultSourceFileByFileName(file)
            const qingkuaiSnapshot = ensureGetSnapshotOfQingkuaiFile(file)
            assert(!!sourceFile)

            const checkPositionFlag = (pos: number, key: PositionFlagKeys) => {
                return isPositionFlagSetBySourceIndex(qingkuaiSnapshot, pos, key)
            }

            const getSourcePos = (line: number, character: number, isEnd = false) => {
                const interIndex = ts.getPositionOfLineAndCharacter(
                    sourceFile,
                    line - 1,
                    character - 1
                )
                return getSourceIndex(qingkuaiSnapshot, interIndex, isEnd)
            }

            locs.forEach((loc: any) => {
                const startPos = getSourcePos(loc.start.line, loc.start.offset)
                const endPos = getSourcePos(loc.end.line, loc.end.offset, true)
                const ctxStartPos = getSourcePos(loc.contextStart.line, loc.contextStart.offset)
                const ctxEndPos = getSourcePos(loc.contextEnd.line, loc.contextEnd.offset, true)

                // prettier-ignore
                if (
                    !endPos ||
                    !startPos ||
                    !ctxEndPos ||
                    !ctxStartPos ||
                    startPos === -1 ||
                    endPos === -1 ||
                    ctxEndPos === -1 ||
                    ctxStartPos === -1 ||
                    (
                        !checkPositionFlag(startPos, "inScript") &&
                        !checkPositionFlag(startPos, "isAttributeStart")
                    )
                ) {
                    return
                }

                const delta = +checkPositionFlag(startPos, "isInterpolationAttributeStart")
                dealtLocs.push({
                    start: {
                        line: qingkuaiSnapshot.positions[startPos].line,
                        offset: qingkuaiSnapshot.positions[startPos].column + 1 + delta
                    },
                    end: {
                        line: qingkuaiSnapshot.positions[endPos].line,
                        offset: qingkuaiSnapshot.positions[endPos].column + 1
                    }

                    // unnecessary
                    // contextStart: {
                    //     line: qingkuaiSnapshot.positions[ctxStartPos].line,
                    //     offset: qingkuaiSnapshot.positions[ctxStartPos].column
                    // },
                    // contextEnd: {
                    //     line: qingkuaiSnapshot.positions[ctxEndPos].line,
                    //     offset: qingkuaiSnapshot.positions[ctxEndPos].column
                    // }
                })
            })
            dealtLocs.length && retLocs.push({ file, locs: dealtLocs })
        }

        return {
            ...originalRet,
            response: { ...originalRet.response, locs: retLocs }
        }
    }

    proxiedHandler[HasBeenProxiedByQingKuai] = true
    sessionAny.handlers.set("rename", proxiedHandler)
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

    if (
        isUndefined(resolveModuleLiterals) ||
        // @ts-expect-error: access supplementary property
        languageServiceHost.resolveModuleNameLiterals[HasBeenProxiedByQingKuai]
    ) {
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

            const qingkuaiSnapshot = ensureGetSnapshotOfQingkuaiFile(modulePath)
            const extension = qingkuaiSnapshot.scriptKind === ts.ScriptKind.TS ? ".ts" : ".js"
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

    // @ts-expect-error: attach supplementary property
    languageServiceHost.resolveModuleNameLiterals[HasBeenProxiedByQingKuai] = true
}
