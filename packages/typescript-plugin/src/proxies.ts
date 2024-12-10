import type { TsModuleResolutionBackup } from "./types"
import type { Diagnostic, IScriptSnapshot, DiagnosticMessageChain } from "typescript"

import fs from "fs"
import path from "path"

import {
    ts,
    snapshotCache,
    projectService,
    languageService,
    typeRefStatement,
    languageServiceHost,
    resolvedQingkuaiModule
} from "./state"
import {
    getRealName,
    getMappedQkFiles,
    isMappingFileName,
    getMappingFileInfo,
    assignMappingFileForQkFile
} from "./server/content/document"
import { compile } from "qingkuai/compiler"
import { mappingFileNameRE } from "./regular"
import { getConfigByFileName } from "./server/config"
import { refreshDiagnostics } from "./server/diagnostic/refresh"
import { getScriptKindKey } from "../../../shared-util/qingkuai"
import { updateQingkuaiSnapshot } from "./server/content/snapshot"
import { HasBeenProxiedByQingKuai, OriSourceFile } from "./constant"
import { isEmptyString, isString, isUndefined } from "../../../shared-util/assert"

export function proxyGetScriptFileNames() {
    const getscriptFileNames = languageServiceHost.getScriptFileNames.bind(languageServiceHost)
    languageServiceHost.getScriptFileNames = () => {
        return getscriptFileNames().concat(getMappedQkFiles())
    }
}

export function proxyGetScriptVersion() {
    const getScriptVersion = languageServiceHost.getScriptVersion.bind(languageServiceHost)
    languageServiceHost.getScriptVersion = fileName => {
        if (!isMappingFileName(fileName)) {
            return getScriptVersion(fileName)
        }
        return getMappingFileInfo(getRealName(fileName)!)!.version.toString()
    }
}

export function proxyGetScriptKind() {
    const getScriptKind = languageServiceHost.getScriptKind?.bind(languageServiceHost)
    if (isUndefined(getScriptKind)) {
        return
    }

    languageServiceHost.getScriptKind = fileName => {
        if (!isMappingFileName(fileName)) {
            return getScriptKind(fileName)
        }
        return getMappingFileInfo(getRealName(fileName)!)!.scriptKind
    }
}

export function proxyOnConfigFileChanged() {
    // 断言为any以访问其私有属性
    // assert to access its private property
    const projectServiceAsAny = projectService as any
    const onConfigFileChanged = projectServiceAsAny.onConfigFileChanged.bind(projectService)
    projectServiceAsAny.onConfigFileChanged = (...args: any) => {
        setTimeout(() => {
            refreshDiagnostics("///ts", false)
        }, 2500)
        return onConfigFileChanged(...args)
    }
}

// 代理查询文件是否存在的方法，扩展名为qk的文件直接返回false，它们在ts语言
// 服务中的扩展名为ts，可以通过getMappingFileName获取到qk文件映射的ts文件名称
export function proxyFileExists() {
    const projectServiceFileExists = projectService.host.fileExists.bind(projectService.host)
    const languageServiceFileExists = languageServiceHost.fileExists.bind(languageServiceHost)
    projectService.host.fileExists = path => {
        if (path.endsWith(".qk")) {
            return false
        }
        return isMappingFileName(path) || projectServiceFileExists(path)
    }
    languageServiceHost.fileExists = path => {
        return isMappingFileName(path) || languageServiceFileExists(path)
    }
}

// 代理获取快照的方法，qk文件的快照为QingKuaiSnapshot，且由snapshotCache缓存
export function proxyGetScriptSnapshot() {
    const getScriptSnapshot = languageServiceHost.getScriptSnapshot.bind(languageServiceHost)
    languageServiceHost.getScriptSnapshot = fileName => {
        return snapshotCache.get(fileName) || getScriptSnapshot(fileName)
    }
}

// 代理模块解析方法，如果目标是qk文件且它存在于本地磁盘，解析的模块路径为映射文件名，这些映射文件的
// 扩展名均为.ts，当映射文件名不存在时，需要调用assignMappingFileForQkFile方法为其分配一个映射文件名
export function proxyResolveModuleNameLiterals() {
    const resolveModuleNameLiterals =
        languageServiceHost.resolveModuleNameLiterals?.bind(languageServiceHost)
    if (isUndefined(resolveModuleNameLiterals)) {
        return undefined
    }

    const tsModuleResolutionBackup: TsModuleResolutionBackup = new Map()
    languageServiceHost.resolveModuleNameLiterals = (moduleLiterals, containingFile, ...rest) => {
        const curDir = path.dirname(containingFile)
        const config = getConfigByFileName(containingFile)
        const fromQingKuaiFile = isMappingFileName(containingFile)
        const ret = resolveModuleNameLiterals(moduleLiterals, containingFile, ...rest)

        let backup = tsModuleResolutionBackup.get(containingFile)
        if (isUndefined(backup)) {
            backup = new Map()
            tsModuleResolutionBackup.set(containingFile, backup)
        }

        let qingkuaiModules = resolvedQingkuaiModule.get(containingFile)
        if (isUndefined(qingkuaiModules)) {
            qingkuaiModules = new Set()
            resolvedQingkuaiModule.set(containingFile, qingkuaiModules)
        }

        return ret.map((item, index) => {
            const moduleText = moduleLiterals[index].text
            const isDirectory = isEmptyString(path.extname(moduleText))
            const resolveAsQk = isDirectory && fromQingKuaiFile && config.resolveImportExtension

            const modulePath = path.resolve(curDir, `${moduleText}${resolveAsQk ? ".qk" : ""}`)
            if (!modulePath.endsWith(".qk") || !fs.existsSync(modulePath)) {
                qingkuaiModules.delete(moduleText)
                return backup.get(moduleText) ?? item
            }

            // 如果某个导入语句被添加了qk扩展名，则备份原始解析对象
            if (resolveAsQk && !backup.has(moduleText)) {
                backup.set(moduleText, item)
            }

            // 记录当前导入路径为qingkuai模块
            qingkuaiModules.add(moduleText)

            let mappingFileInfo = getMappingFileInfo(modulePath)
            if (isUndefined(mappingFileInfo)) {
                const compileRes = compile(fs.readFileSync(modulePath, "utf-8"), {
                    check: true,
                    typeRefStatement
                })
                const scriptKind = ts.ScriptKind[getScriptKindKey(compileRes)]
                setTimeout(() => {
                    updateQingkuaiSnapshot(
                        modulePath,
                        compileRes.code,
                        compileRes.interIndexMap.itos,
                        compileRes.inputDescriptor.slotInfo,
                        scriptKind
                    )
                })
                mappingFileInfo = assignMappingFileForQkFile(modulePath, false, {
                    scriptKind,
                    interCode: compileRes.code,
                    itos: compileRes.interIndexMap.itos,
                    slotInfo: compileRes.inputDescriptor.slotInfo
                })
            }

            const isTs = mappingFileInfo.scriptKind === ts.ScriptKind.TS
            return {
                ...item,
                resolvedModule: {
                    isExternalLibraryImport: false,
                    resolvedUsingTsExtension: false,
                    extension: ts.Extension[isTs ? "Ts" : "Js"],
                    resolvedFileName: mappingFileInfo.mappingFileName
                },
                failedLookupLocations: undefined
            }
        })
    }
}

// 非qk文件修改时，需要刷新已打开的qk文件诊断信息
export function proxyEditContent() {
    const getScriptInfo = projectService.getScriptInfo.bind(projectService)
    projectService.getScriptInfo = fileName => {
        // 断言为any，以访问其私有属性及添加新属性
        // asserts to access its private property and add new property
        const scriptInfoAsAny = getScriptInfo(fileName) as any
        if (
            !isUndefined(scriptInfoAsAny) &&
            !scriptInfoAsAny.fileName.endsWith(".qk") &&
            !scriptInfoAsAny[HasBeenProxiedByQingKuai] &&
            !isUndefined(scriptInfoAsAny?.editContent) &&
            !isMappingFileName(scriptInfoAsAny.fileName)
        ) {
            const editContent = scriptInfoAsAny.editContent.bind(scriptInfoAsAny)
            scriptInfoAsAny.editContent = (start: number, end: number, newText: string) => {
                const snapshot: IScriptSnapshot = scriptInfoAsAny.getSnapshot()
                const contentLength = snapshot.getLength()
                if (
                    end !== contentLength ||
                    !(
                        (start === end && newText === " ") ||
                        (start === end - 1 && isEmptyString(newText))
                    )
                ) {
                    // 确保当前修改不是由其他.qk文件改动时重新获取诊断信息触发
                    refreshDiagnostics(fileName, false)
                }
                return editContent(start, end, newText)
            }
            scriptInfoAsAny[HasBeenProxiedByQingKuai] = true
        }
        return scriptInfoAsAny
    }
}

// 代理诊断信息获取方法
export function proxyGetDiagnostics() {
    const getSemanticDiagnostics = languageService.getSemanticDiagnostics.bind(languageService)
    const getSyntacticDiagnostics = languageService.getSyntacticDiagnostics.bind(languageService)
    const getSuggestionDiagnostics = languageService.getSuggestionDiagnostics.bind(languageService)

    languageService.getSemanticDiagnostics = fileName => {
        const ret = getSemanticDiagnostics(fileName)
        return foreachDiagnostics(ret), ret
    }
    languageService.getSyntacticDiagnostics = fileName => {
        const ret = getSyntacticDiagnostics(fileName)
        return foreachDiagnostics(ret), ret
    }
    languageService.getSuggestionDiagnostics = fileName => {
        const ret = getSuggestionDiagnostics(fileName)
        return foreachDiagnostics(ret), ret
    }
}

// 将字符串中所有的mappingFileName替换为真实文件名称
function m2r(str: string) {
    return str.replace(mappingFileNameRE, "")
}

// 将诊断信息中的映射文件名称修改为真实文件名称
function foreachDiagnostics(diagnostics: Diagnostic[]) {
    diagnostics.forEach(item => {
        if (!isString(item.messageText)) {
            changeDiagnosticMessageChain(item.messageText)
        } else {
            item.messageText = m2r(item.messageText)
        }

        // 如果相关信息中的sourceFile为qk文件，则修改其文件名称
        if (!isUndefined(item.relatedInformation)) {
            item.relatedInformation = item.relatedInformation.map(info => {
                if (!isUndefined(info.file) && isMappingFileName(info.file.fileName)) {
                    return {
                        ...info,
                        file: {
                            ...info.file,
                            [OriSourceFile]: info.file,
                            fileName: m2r(info.file.fileName)
                        } as any
                    }
                }
                return info
            })
        }
    })
}

function changeDiagnosticMessageChain(messageChain: DiagnosticMessageChain) {
    if (!isUndefined(messageChain.next)) {
        messageChain.next.forEach(changeDiagnosticMessageChain)
    }
    messageChain.messageText = m2r(messageChain.messageText)
}
