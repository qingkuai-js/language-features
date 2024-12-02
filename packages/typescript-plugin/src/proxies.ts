import type { IScriptSnapshot } from "typescript"

import fs from "fs"
import path from "path"

import {
    getRealName,
    getMappedQkFiles,
    isMappingFileName,
    getMappingFileInfo,
    assignMappingFileForQkFile
} from "./server/document"
import { compile } from "qingkuai/compiler"
import { HasBeenProxiedByQingKuai } from "./constant"
import { refreshDiagnostics } from "./server/diagnostic"
import { getScriptKindKey } from "../../../shared-util/qingkuai"
import { updateQingkuaiSnapshot } from "./server/updateSnapshot"
import { isEmptyString, isUndefined } from "../../../shared-util/assert"
import { ts, languageServiceHost, projectService, snapshotCache, typeRefStatement } from "./state"

export function proxyGetScriptFileNames() {
    const ori = languageServiceHost.getScriptFileNames.bind(languageServiceHost)
    languageServiceHost.getScriptFileNames = () => {
        return ori().concat(getMappedQkFiles())
    }
}

export function proxyGetScriptVersion() {
    const ori = languageServiceHost.getScriptVersion.bind(languageServiceHost)
    languageServiceHost.getScriptVersion = fileName => {
        if (!isMappingFileName(fileName)) {
            return ori(fileName)
        }
        return getMappingFileInfo(getRealName(fileName)!)!.version.toString()
    }
}

export function proxyGetScriptKind() {
    const ori = languageServiceHost.getScriptKind?.bind(languageServiceHost)
    if (isUndefined(ori)) {
        return
    }

    languageServiceHost.getScriptKind = fileName => {
        if (!isMappingFileName(fileName)) {
            return ori(fileName)
        }
        return getMappingFileInfo(getRealName(fileName)!)!.scriptKind
    }
}

export function proxyOnConfigFileChanged() {
    // 断言为any以访问其私有属性
    // assert to access its private property
    const projectServiceAsAny = projectService as any
    const ori = projectServiceAsAny.onConfigFileChanged.bind(projectService)
    projectServiceAsAny.onConfigFileChanged = (...args: any) => {
        return setTimeout(() => refreshDiagnostics("", false), 2500), ori(...args)
    }
}

// 代理查询文件是否存在的方法，扩展名为qk的文件直接返回false，它们在ts语言
// 服务中的扩展名为ts，可以通过getMappingFileName获取到qk文件映射的ts文件名称
export function proxyFileExists() {
    const pshOri = projectService.host.fileExists.bind(projectService.host)
    const lshOri = languageServiceHost.fileExists.bind(languageServiceHost)
    projectService.host.fileExists = path => {
        if (path.endsWith(".qk")) {
            return false
        }
        return isMappingFileName(path) || pshOri(path)
    }
    languageServiceHost.fileExists = path => {
        return isMappingFileName(path) || lshOri(path)
    }
}

// 代理获取快照的方法，qk文件的快照为QingKuaiSnapshot，且由snapshotCache缓存
export function proxyGetScriptSnapshot() {
    const ori = languageServiceHost.getScriptSnapshot.bind(languageServiceHost)
    languageServiceHost.getScriptSnapshot = fileName => {
        return snapshotCache.get(fileName) || ori(fileName)
    }
}

// 代理模块解析方法，如果目标是qk文件且它存在于本地磁盘，解析的模块路径为映射文件名，这些映射文件的
// 扩展名均为.ts，当映射文件名不存在时，需要调用assignMappingFileForQkFile方法为其分配一个映射文件名
export function proxyResolveModuleNameLiterals() {
    const ori = languageServiceHost.resolveModuleNameLiterals?.bind(languageServiceHost)
    if (isUndefined(ori)) {
        return undefined
    }

    languageServiceHost.resolveModuleNameLiterals = (moduleLiterals, ...rest) => {
        const ret = ori(moduleLiterals, ...rest)
        const curDir = path.dirname(rest[3].fileName)
        ret.forEach((item, index) => {
            const moduleText = moduleLiterals[index].text
            const modulePath = path.resolve(curDir, moduleText)
            if (moduleText.endsWith(".qk") && fs.existsSync(modulePath)) {
                let mappingFileInfo = getMappingFileInfo(modulePath)
                if (isUndefined(mappingFileInfo)) {
                    const compileRes = compile(fs.readFileSync(modulePath, "utf-8"), {
                        check: true,
                        typeRefStatement
                    })
                    setTimeout(() => {
                        updateQingkuaiSnapshot(
                            modulePath,
                            compileRes.code,
                            compileRes.inputDescriptor.slotInfo,
                            ts.ScriptKind[getScriptKindKey(compileRes)]
                        )
                    })
                    mappingFileInfo = assignMappingFileForQkFile(modulePath)
                }
                const isTs = mappingFileInfo?.scriptKind === ts.ScriptKind.TS
                Object.assign(item, {
                    resolvedModule: {
                        packageId: undefined,
                        originalPath: undefined,
                        isExternalLibraryImport: false,
                        resolvedUsingTsExtension: false,
                        extension: ts.Extension[isTs ? "Ts" : "Js"],
                        resolvedFileName: mappingFileInfo.mappingFileName
                    },
                    failedLookupLocations: undefined
                })
            }
        })
        return ret
    }
}

// 非qk文件修改时，需要刷新已打开的qk文件诊断信息
export function proxyEditContent() {
    const ori = projectService.getScriptInfo.bind(projectService)
    projectService.getScriptInfo = fileName => {
        // 断言为any，以访问其私有属性及添加新属性
        // asserts to access its private property and add new property
        const oriRetAsAny = ori(fileName) as any
        if (
            !isUndefined(oriRetAsAny) &&
            !oriRetAsAny.fileName.endsWith(".qk") &&
            !oriRetAsAny[HasBeenProxiedByQingKuai] &&
            !isUndefined(oriRetAsAny?.editContent) &&
            !isMappingFileName(oriRetAsAny.fileName)
        ) {
            const oriEditContent = oriRetAsAny.editContent.bind(oriRetAsAny)
            oriRetAsAny.editContent = (start: number, end: number, newText: string) => {
                const snapshot: IScriptSnapshot = oriRetAsAny.getSnapshot()
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
                return oriEditContent(start, end, newText)
            }
            oriRetAsAny[HasBeenProxiedByQingKuai] = true
        }
        return oriRetAsAny
    }
}
