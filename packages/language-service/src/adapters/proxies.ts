import type TS from "typescript"

import type { TypescriptAdapter } from "./adapter"

import {
    proxyGetCompletionEntryDetailsToConvert,
    proxyGetCompletionsAtPositionToConvert
} from "./convert/completion"
import {
    proxyGetDefinitionAndBoundSpanToConvert,
    proxyGetTypeDefinitionAtPositionToConvert
} from "./convert/definition"
import { PROXIED_MARK } from "../constants"
import { proxyFindReferencesToConvert } from "./convert/reference"
import { proxyGetImplementationAtPositionToConvert } from "./convert/implementation"
import { isEmptyString, isQingkuaiFileName, isUndefined } from "../../../../shared-util/assert"

export function proxyProject(adapter: TypescriptAdapter, project: TS.server.Project) {
    const projectAny = project as any
    if (!projectAny[PROXIED_MARK]) {
        projectAny[PROXIED_MARK] = true

        for (const proxyFn of [
            proxyGetScriptVersion,
            proxyGetScriptKind,
            proxyGetScriptSnapshot,
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

function proxyGetScriptSnapshot(
    adapter: TypescriptAdapter,
    languageServiceHost: TS.LanguageServiceHost
) {
    const getScriptSnapshot = languageServiceHost.getScriptSnapshot
    languageServiceHost.getScriptSnapshot = fileName => {
        if (!isQingkuaiFileName(fileName)) {
            return getScriptSnapshot.call(languageServiceHost, fileName)
        }
        return adapter.ts.ScriptSnapshot.fromString(
            adapter.service.ensureGetQingkuaiFileInfo(fileName).code
        )
    }
}

function proxyGetScriptVersion(
    adapter: TypescriptAdapter,
    languageServiceHost: TS.LanguageServiceHost
) {
    const getScriptVersion = languageServiceHost.getScriptVersion
    languageServiceHost.getScriptVersion = fileName => {
        if (!isQingkuaiFileName(fileName)) {
            return getScriptVersion.call(languageServiceHost, fileName)
        }
        return adapter.service.ensureGetQingkuaiFileInfo(fileName).version.toString()
    }
}

function proxyGetScriptKind(
    adapter: TypescriptAdapter,
    languageServiceHost: TS.LanguageServiceHost
) {
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
    languageServiceHost: TS.LanguageServiceHost
) {
    const resolveModuleLiterals = languageServiceHost.resolveModuleNameLiterals
    if (isUndefined(resolveModuleLiterals)) {
        return
    }

    languageServiceHost.resolveModuleNameLiterals = (moduleLiterals, containingFile, ...rest) => {
        const originalRet = resolveModuleLiterals.call(
            languageServiceHost,
            moduleLiterals,
            containingFile,
            ...rest
        )
        const containingFileInfo = isQingkuaiFileName(containingFile)
            ? adapter.service.ensureGetQingkuaiFileInfo(containingFile)
            : undefined
        const importByQingkuaiFile = isQingkuaiFileName(containingFile)
        const containingFilePath = adapter.getNormalizedPath(containingFile)
        const qingkuaiConfig = adapter.getQingkuaiConfig(containingFilePath)
        const dirPath = adapter.getNormalizedPath(adapter.path.dir(containingFilePath))

        const importedQingkuaiModuleTexts = new Set<string>()
        adapter.resolvedQingkuaiModules.set(containingFilePath, importedQingkuaiModuleTexts)

        const ret = originalRet.map((item, index) => {
            const moduleText = moduleLiterals[index].text
            const isDirectory = isEmptyString(adapter.path.ext(moduleText))
            const inferredAsQingkuaiFile =
                importByQingkuaiFile && isDirectory && qingkuaiConfig?.resolveImportExtension
            const modulePath = adapter.getNormalizedPath(
                adapter.path.resolve(dirPath, moduleText + (inferredAsQingkuaiFile ? ".qk" : ""))
            )
            const moduleFileInfo =
                isQingkuaiFileName(modulePath) && adapter.fs.exist(modulePath)
                    ? adapter.service.ensureGetQingkuaiFileInfo(modulePath)
                    : undefined

            // 以下情况匹配时返回原始结果
            // 1. 被导入目标未被解析为 qingkuai 文件
            // 2. 被导入目标被解析为 qingkuai 文件，但其在文件系统中不存在或与导入侧文件路径相同
            // 3. 导入侧文件的脚本类型为 TS，被导入目标被解析为 qingkuai 文件但其脚本类型为 JS，且编译选项未开启 allowJs
            //    第三种情况放行：保持与 typescript 文件的一致行为，若要支持则取消 if 中的最后一个条件
            // 注意：当被导入目标被解析为 qingkuai 文件时，需要将解析出的文件路径添加到 item.failedLookupLocations 数组
            if (
                !moduleFileInfo ||
                modulePath === containingFileInfo?.path
                // || (containingFileInfo.isTS && !moduleFileInfo.isTS && !compilationSettings.allowJs)
            ) {
                if (inferredAsQingkuaiFile && !item.resolvedModule) {
                    ;((item as any).failedLookupLocations ??= []).push(modulePath)
                }
                return item
            }
            importedQingkuaiModuleTexts!.add(moduleText)

            return {
                ...item,
                resolvedModule: {
                    isExternalLibraryImport: false,
                    resolvedUsingTsExtension: false,
                    extension: moduleFileInfo.isTS ? ".ts" : ".js",
                    resolvedFileName: adapter.getNormalizedPath(modulePath)
                },
                failedLookupLocations: undefined
            }
        })

        return ret
    }
}
