import type TS from "typescript"
import type { ConvertProtocolTextSpanWithContextVerifier, TSPluginCreateInfo } from "./types"

import {
    ts,
    session,
    commandStatus,
    projectService,
    openQingkuaiFiles,
    resolvedQingkuaiModule
} from "./state"
import fs from "node:fs"
import path from "node:path"
import { runAll } from "../../../shared-util/sundry"
import { HAS_BEEN_PROXIED_BY_QINGKUAI } from "./constant"
import { refreshDiagnostics } from "./server/diagnostic/refresh"
import { getConfigByFileName } from "./server/configuration/method"
import { initialEditQingkuaiFileSnapshot } from "./server/content/method"
import { isEmptyString, isQingkuaiFileName, isUndefined } from "../../../shared-util/assert"
import { convertProtocolDefinitions, convertProtocolTextSpanWithContext } from "./util/protocol"
import { isPositionFlagSetBySourceIndex, ensureGetSnapshotOfQingkuaiFile } from "./util/qingkuai"

export function proxyTypescriptProjectServiceAndSystemMethods() {
    runAll([
        proxyReadFile,
        proxyGetFileSize,
        proxyEditContent,
        proxyGetReferences,
        proxyExecuteCommand,
        proxyCloseClientFile,
        proxyGetImplementation,
        proxyOnConfigFileChanged,
        proxyRenameSessionHandler,
        proxyFindSourceDefinition,
        proxyGetDefinitionAndBoundSpan,
        proxyUpdateRootAndOptionsOfNonInferredProject
    ])
}

export function proxyTypescriptLanguageServiceMethods(info: TSPluginCreateInfo) {
    const { project, languageServiceHost } = info
    runAll([
        () => proxyGetScriptSnapshot(project),
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

function proxyExecuteCommand() {
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

function proxyCloseClientFile() {
    const closeClientFile = projectService.closeClientFile
    projectService.closeClientFile = fileName => {
        if (openQingkuaiFiles.has(fileName)) {
            return
        }
        return closeClientFile.call(projectService, fileName)
    }
}

function proxyGetScriptKind(languageServiceHost: TS.LanguageServiceHost) {
    const getScriptKind = languageServiceHost.getScriptKind
    if (isUndefined(getScriptKind) || (getScriptKind as any)[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }

    languageServiceHost.getScriptKind = fileName => {
        if (!isQingkuaiFileName(fileName)) {
            return getScriptKind.call(languageServiceHost, fileName)
        }

        return ensureGetSnapshotOfQingkuaiFile(fileName).scriptKind
    }

    // @ts-expect-error: attach supplementary property
    languageServiceHost.getScriptKind[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}

function proxyGetScriptVersion(languageServiceHost: TS.LanguageServiceHost) {
    const getScriptVersion = languageServiceHost.getScriptVersion
    if ((getScriptVersion as any)[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }

    languageServiceHost.getScriptVersion = fileName => {
        if (!isQingkuaiFileName(fileName)) {
            return getScriptVersion.call(languageServiceHost, fileName)
        }
        return ensureGetSnapshotOfQingkuaiFile(fileName).version.toString()
    }

    // @ts-expect-error: attach supplementary property
    languageServiceHost.getScriptVersion[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
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

function proxyGetReferences() {
    const sessionAny = session as any
    const getReferences = sessionAny.getReferences
    if (!session || getReferences[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }
    sessionAny.getReferences = (...args: any) => {
        const dealtRefs: any[] = []
        const originalRet = getReferences.call(session, ...args)
        for (let i = 0; i < (originalRet.refs?.length || 0); i++) {
            const ref: TS.server.protocol.FileSpan = originalRet.refs[i]
            const convertRes = convertProtocolTextSpanWithContext(ref.file, ref)
            convertRes && dealtRefs.push({ ...ref, ...convertRes })
        }
        return (originalRet.refs = dealtRefs), originalRet
    }
    sessionAny.getReferences[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}

function proxyGetDefinitionAndBoundSpan() {
    const sessionAny = session as any
    const getDefinitionAndBoundSpan = sessionAny?.getDefinitionAndBoundSpan
    if (!session || getDefinitionAndBoundSpan[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }
    sessionAny.getDefinitionAndBoundSpan = (...args: any) => {
        const originalRet = getDefinitionAndBoundSpan.call(session, ...args)
        return convertProtocolDefinitions(originalRet.definitions), originalRet
    }
    sessionAny.getDefinitionAndBoundSpan[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}

function proxyFindSourceDefinition() {
    const sessionAny = session as any
    const findSourceDefinition = sessionAny.findSourceDefinition
    if (!session || findSourceDefinition[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }
    sessionAny.findSourceDefinition = (...args: any) => {
        const originalRet = findSourceDefinition.call(session, ...args)
        return convertProtocolDefinitions(originalRet), originalRet
    }
    sessionAny.findSourceDefinition[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}

function proxyGetImplementation() {
    const sessionAny = session as any
    const getImplementation = sessionAny.getImplementation
    if (!session || getImplementation[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }
    sessionAny.getImplementation = (...args: any) => {
        const originalRet = getImplementation.call(session, ...args)
        return originalRet?.map((item: TS.server.protocol.FileSpan) => {
            return {
                ...item,
                ...convertProtocolTextSpanWithContext(item.file, item)
            }
        })
    }
    sessionAny.getImplementation[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}

// 代理文件编辑，非qk文件修改时应刷新qk文件的诊断信息
function proxyEditContent() {
    const getScriptInfo = projectService.getScriptInfo.bind(projectService)
    projectService.getScriptInfo = fileName => {
        const scriptInfo = getScriptInfo(fileName)

        if (
            scriptInfo &&
            !isQingkuaiFileName(fileName) &&
            !(scriptInfo.editContent as any)[HAS_BEEN_PROXIED_BY_QINGKUAI]
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
            scriptInfo.editContent[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
        }

        return scriptInfo
    }
}

function proxyRenameSessionHandler() {
    if (isUndefined(session)) {
        return
    }

    const sessionAny = session as any
    const originalHandler = sessionAny.handlers.get("rename")
    if (originalHandler[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
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
            for (let i = 0, delta = 0; i < locs.length; i++) {
                const verifier: ConvertProtocolTextSpanWithContextVerifier = (
                    index,
                    snapshot,
                    itemKind
                ) => {
                    if (itemKind !== "start") {
                        return true
                    }
                    delta = +isPositionFlagSetBySourceIndex(
                        snapshot,
                        index,
                        "isInterpolationAttributeStart"
                    )
                    return (
                        isPositionFlagSetBySourceIndex(snapshot, index, "inScript") ||
                        isPositionFlagSetBySourceIndex(snapshot, index, "isAttributeStart")
                    )
                }

                const convertRes = convertProtocolTextSpanWithContext(file, locs[i], verifier)
                if (!convertRes) {
                    continue
                }
                dealtLocs.push(convertRes)
                convertRes.start.offset += delta
            }
            dealtLocs.length && retLocs.push({ file, locs: dealtLocs })
        }

        return {
            ...originalRet,
            response: { ...originalRet.response, locs: retLocs }
        }
    }

    proxiedHandler[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
    sessionAny.handlers.set("rename", proxiedHandler)
}

function proxyGetScriptSnapshot(project: TS.server.Project) {
    const getScriptSnapshot = project.getScriptSnapshot
    if ((getScriptSnapshot as any)[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }

    project.getScriptSnapshot = fileName => {
        if (!isQingkuaiFileName(fileName)) {
            return getScriptSnapshot.call(project, fileName)
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
    project.getScriptSnapshot[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
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
        languageServiceHost.resolveModuleNameLiterals[HAS_BEEN_PROXIED_BY_QINGKUAI]
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
    languageServiceHost.resolveModuleNameLiterals[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}
