import type TS from "typescript"

import { getRealPath } from "./qingkuai"
import { isEmptyString, isQingkuaiFileName, isUndefined } from "../../../../shared-util/assert"
import { fs, getConfig, path, resolvedQingkuaiModule, ts, typeDeclarationFilePath } from "./state"

export function proxyGetCompletionsAtPosition(languageService: TS.LanguageService) {
    const getCompletionsAtPosition = languageService.getCompletionsAtPosition
    languageService.getCompletionsAtPosition = (fileName, position, ...rest) => {
        const originalResult = getCompletionsAtPosition.call(
            languageService,
            fileName,
            position,
            ...rest
        )
        if (originalResult?.entries) {
            originalResult.entries = originalResult.entries.filter(entry => {
                return (
                    !entry.source ||
                    !typeDeclarationFilePath.startsWith(
                        path.resolve(path.dir(fileName), entry.source)
                    )
                )
            })
        }
        return originalResult
    }
}

export function proxyResolveModuleNameLiterals(
    languageServiceHost: TS.LanguageServiceHost,
    couldBeImpoted: (modulePath: string) => boolean
) {
    const resolveModuleLiterals = languageServiceHost.resolveModuleNameLiterals
    if (isUndefined(resolveModuleLiterals)) {
        return
    }

    languageServiceHost.resolveModuleNameLiterals = (moduleLiterals, containingFile, ...rest) => {
        const containingFileRealPath = getRealPath(containingFile)
        const originalRet = resolveModuleLiterals.call(
            languageServiceHost,
            moduleLiterals,
            containingFile,
            ...rest
        )
        const qingkuaiModules = new Set<string>()
        const curDir = path.dir(containingFileRealPath)
        const config = getConfig(containingFileRealPath)
        const fromQk = isQingkuaiFileName(containingFile)

        const ret = originalRet.map((item, index) => {
            const moduleText = moduleLiterals[index].text
            const isDirectory = isEmptyString(path.ext(moduleText))
            const resolveAsQk = fromQk && isDirectory && config?.resolveImportExtension
            const modulePath = path.resolve(curDir, moduleText + (resolveAsQk ? ".qk" : ""))

            // 导入项非qingkuai文件，返回原始值
            if (!isQingkuaiFileName(modulePath)) {
                return item
            }

            // 导入项为qingkuai文件，但文件不存在，修改failedLooupLocations
            if (!fs.exist(modulePath)) {
                return {
                    ...item,
                    failedLookupLocations: [modulePath]
                }
            }

            if (!couldBeImpoted(modulePath)) {
                return item
            }
            qingkuaiModules!.add(moduleText)

            const scriptKind = languageServiceHost.getScriptKind?.(modulePath)
            return {
                ...item,
                resolvedModule: {
                    isExternalLibraryImport: false,
                    resolvedUsingTsExtension: false,
                    resolvedFileName: ts.server.toNormalizedPath(modulePath),
                    extension: scriptKind === ts.ScriptKind.TS ? ".ts" : ".js"
                },
                failedLookupLocations: undefined
            }
        })
        if (qingkuaiModules.size) {
            resolvedQingkuaiModule.set(containingFileRealPath, qingkuaiModules)
        }
        return ret
    }
}
