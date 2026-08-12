import type TS from "typescript"
import type { QingkuaiFileInfo } from "./file"
import type { TypescriptAdapter } from "./adapter"
import type { AdapterPath, TsPluginQingkuaiConfig } from "../../../../types/common"
import type { AdapterTsProject, ResolveModuleNameLiteralsFunc } from "../types/adapter"

import {
    proxyGetCompletionEntryDetailsToConvert,
    proxyGetCompletionsAtPositionToConvert
} from "./convert/completion"
import {
    proxyGetDefinitionAndBoundSpanToConvert,
    proxyGetTypeDefinitionAtPositionToConvert
} from "./convert/definition"
import { LS_PACKAGE, PROXIED_MARK } from "../constants"
import { proxyGetQuickInfoAtPosition } from "./convert/hover"
import { proxyFindReferencesToConvert } from "./convert/reference"
import { proxyGetImplementationAtPositionToConvert } from "./convert/implementation"
import { isEmptyString, isQingkuaiFileName, isUndefined } from "../../../../shared-util/assert"

export function proxyProject(adapter: TypescriptAdapter, project: AdapterTsProject) {
    const projectAny = project as any
    if (!projectAny[PROXIED_MARK]) {
        projectAny[PROXIED_MARK] = true

        for (const proxyFn of [
            proxyGetScriptVersion,
            proxyGetScriptKind,
            proxyGetScriptSnapshot,
            proxyGetQuickInfoAtPosition,
            proxyFindReferencesToConvert,
            proxyResolveModuleNameLiterals,
            proxyGetCompletionsAtPositionToConvert,
            proxyGetCompletionEntryDetailsToConvert,
            proxyGetDefinitionAndBoundSpanToConvert,
            proxyGetTypeDefinitionAtPositionToConvert,
            proxyGetImplementationAtPositionToConvert
        ]) {
            proxyFn(adapter, project)
        }
    }
}

export function getOverrideResolveModuleLiterals(
    ts: typeof TS,
    path: AdapterPath,
    original: ResolveModuleNameLiteralsFunc,
    getQingkuaiFileInfo: (path: string) => QingkuaiFileInfo,
    getQingkuaiConfig: (path: string) => TsPluginQingkuaiConfig
): ResolveModuleNameLiteralsFunc {
    const isQingkuaiFileAndExit = (path: string) => {
        return isQingkuaiFileName(path) && ts.sys.fileExists(path)
    }

    // 解析导入路径时如果去除扩展名后的文件名称是 qk 文件且其存在则视为路径存在有效文件
    const qkAwareHost: TS.ModuleResolutionHost = {
        ...ts.sys,
        fileExists: fileName => {
            if (ts.sys.fileExists(fileName)) {
                return true
            }

            const ext = path.ext(fileName)
            const withoutExt = fileName.slice(0, -ext.length)
            switch (ext) {
                case ".ts":
                case ".tsx":
                case ".js":
                case ".jsx":
                case ".mts":
                case ".mjs":
                case ".cts":
                case ".cjs":
                case ".d.ts": {
                    return isQingkuaiFileAndExit(withoutExt)
                }
                default: {
                    return false
                }
            }
        }
    }

    return (moduleLiterals, containingFile, ...rest) => {
        const [redirectedReference, compilerOptions] = rest

        // 通过 ts.resolveModuleName 获取 paths 映射后的 .qk 文件路径
        const resolveQingkuaiFileWithPaths = (specifier: string) => {
            const result = ts.resolveModuleName(
                specifier,
                containingFile,
                compilerOptions,
                qkAwareHost,
                undefined,
                redirectedReference
            )
            if (!result.resolvedModule) {
                return
            }

            const resolvedPath = result.resolvedModule.resolvedFileName
            const ext = path.ext(resolvedPath)
            if (!ext) {
                return
            }

            const qkPath = resolvedPath.slice(0, -ext.length)
            const normalized = ts.server.toNormalizedPath(qkPath)
            return isQingkuaiFileAndExit(normalized) ? normalized : undefined
        }

        const containingFileInfo = isQingkuaiFileName(containingFile)
            ? getQingkuaiFileInfo(containingFile)
            : undefined
        const originalRet = original(moduleLiterals, containingFile, ...rest)
        const containingFilePath = ts.server.toNormalizedPath(containingFile)
        const qingkuaiConfiguration = getQingkuaiConfig(containingFilePath)
        const dirPath = ts.server.toNormalizedPath(path.dir(containingFilePath))

        const ret = originalRet.map((item, index) => {
            let modulePath = ""
            const moduleText = moduleLiterals[index].text

            // 显式 .qk 导入：任何文件类型都支持
            if (isQingkuaiFileName(moduleText)) {
                const resolvedQkPath =
                    resolveQingkuaiFileWithPaths(moduleText) || path.resolve(dirPath, moduleText)
                const normalized = ts.server.toNormalizedPath(resolvedQkPath)
                if (isQingkuaiFileName(normalized) && ts.sys.fileExists(normalized)) {
                    modulePath = normalized
                }
            }

            // qk 文件的无扩展名导入且配置了 resolveImportExtension
            const failedQkFiles: string[] = []
            const inferredAsQingkuaiFile =
                !modulePath &&
                isQingkuaiFileName(containingFile) &&
                isEmptyString(path.ext(moduleText)) &&
                qingkuaiConfiguration?.resolveImportExtension

            if (inferredAsQingkuaiFile) {
                for (const suffix of [".qk", "/index.qk"]) {
                    const candidateSpecifier = moduleText + suffix
                    const candidatePath = path.resolve(dirPath, candidateSpecifier)
                    const resolvedQingkuaiFilePath =
                        resolveQingkuaiFileWithPaths(candidateSpecifier)
                    if (!resolvedQingkuaiFilePath) {
                        failedQkFiles.push(candidatePath)
                    } else {
                        modulePath = resolvedQingkuaiFilePath
                        break
                    }
                }
            }

            const moduleFileInfo =
                isQingkuaiFileName(modulePath) && ts.sys.fileExists(modulePath)
                    ? getQingkuaiFileInfo(modulePath)
                    : undefined

            if (!moduleFileInfo || modulePath === containingFileInfo?.path) {
                if (
                    containingFileInfo &&
                    moduleText === LS_PACKAGE &&
                    item.resolvedModule?.packageId
                ) {
                    containingFileInfo.qingkuaiPackagePath =
                        item.resolvedModule?.resolvedFileName ?? ""
                }
                if (inferredAsQingkuaiFile && !item.resolvedModule) {
                    ;((item as any).failedLookupLocations ??= []).push(...failedQkFiles)
                }
                return item
            }

            if (containingFileInfo && item.resolvedModule?.packageId) {
                containingFileInfo.qingkuaiPackagePath = item.resolvedModule?.resolvedFileName ?? ""
            }

            return {
                ...item,
                resolvedModule: {
                    isExternalLibraryImport: false,
                    resolvedUsingTsExtension: false,
                    extension: moduleFileInfo.isTS ? ".ts" : ".js",
                    resolvedFileName: ts.server.toNormalizedPath(modulePath)
                },
                failedLookupLocations: undefined
            }
        })

        return ret
    }
}

function proxyGetScriptSnapshot(adapter: TypescriptAdapter, languageServiceHost: AdapterTsProject) {
    const getScriptSnapshot = languageServiceHost.getScriptSnapshot
    languageServiceHost.getScriptSnapshot = fileName => {
        const originalRet = getScriptSnapshot?.call(languageServiceHost, fileName)
        if (!isQingkuaiFileName(fileName)) {
            return originalRet
        }
        return adapter.ts.ScriptSnapshot.fromString(
            adapter.service.ensureGetQingkuaiFileInfo(fileName).code
        )
    }
}

function proxyGetScriptVersion(adapter: TypescriptAdapter, languageServiceHost: AdapterTsProject) {
    const getScriptVersion = languageServiceHost.getScriptVersion
    languageServiceHost.getScriptVersion = fileName => {
        if (!isQingkuaiFileName(fileName)) {
            return getScriptVersion?.call(languageServiceHost, fileName) ?? ""
        }
        return adapter.service.ensureGetQingkuaiFileInfo(fileName).version.toString()
    }
}

function proxyGetScriptKind(adapter: TypescriptAdapter, languageServiceHost: AdapterTsProject) {
    const getScriptKind = languageServiceHost.getScriptKind
    if (getScriptKind) {
        languageServiceHost.getScriptKind = fileName => {
            if (!isQingkuaiFileName(fileName)) {
                return getScriptKind.call(languageServiceHost, fileName)
            }
            return adapter.service.ensureGetQingkuaiFileInfo(fileName).isTS
                ? adapter.ts.ScriptKind.TS
                : adapter.ts.ScriptKind.JS
        }
    }
}

// 用于决定 qingkuai 文件中的导入语句所指向的文件
function proxyResolveModuleNameLiterals(
    adapter: TypescriptAdapter,
    languageServiceHost: AdapterTsProject
) {
    const resolveModuleNameLiterals = languageServiceHost.resolveModuleNameLiterals
    if (isUndefined(resolveModuleNameLiterals)) {
        return
    }

    languageServiceHost.resolveModuleNameLiterals = getOverrideResolveModuleLiterals(
        adapter.ts,
        adapter.path,
        resolveModuleNameLiterals.bind(languageServiceHost),
        path => adapter.service.ensureGetQingkuaiFileInfo(path),
        path => adapter.getQingkuaiConfig(path)
    )
}
