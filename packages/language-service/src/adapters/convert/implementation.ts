import type { AdapterTsProject } from "../../types/adapter"

import type {
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../../types/communication"
import type { TypescriptAdapter } from "../adapter"

import { debugAssert, isQingkuaiFileName } from "../../../../../shared-util/assert"

// 待办：优先使用 originFileName、originTextSpan 以及 originContextSpan 以支持 .d.ts.map 映射文件

export function findAndConvertImplementations(
    adapter: TypescriptAdapter,
    params: TPICCommonRequestParams
): FindReferenceResultItem[] | null {
    const filePath = adapter.getNormalizedPath(params.fileName)
    const languageService = adapter.getDefaultLanguageService(filePath)!
    if (!debugAssert(languageService)) {
        return null
    }

    /**
     * 返回值已被 {@link proxyGetImplementationAtPositionToConvert} 处理，
     * 所有 reference 项的位置信息都是基于源码的，无需进行索引映射
     */
    const implementations = languageService.getImplementationAtPosition(filePath, params.pos)
    if (!implementations) {
        return null
    }

    return implementations.map(implementation => {
        const implementationLocationConvertor = adapter.service.createLocationConvertor(
            implementation.fileName
        )
        return {
            range: implementationLocationConvertor.languageServerRange.fromSourceTextSpan(
                implementation.textSpan
            ),
            fileName: adapter.getNormalizedPath(implementation.fileName)
        }
    })
}

export function proxyGetImplementationAtPositionToConvert(
    adapter: TypescriptAdapter,
    project: AdapterTsProject
) {
    const languageService = project.getLanguageService()
    const getImplementationsAtPosition = languageService.getImplementationAtPosition
    languageService.getImplementationAtPosition = (fileName, position) => {
        const originalRet = getImplementationsAtPosition.call(languageService, fileName, position)
        return originalRet?.filter(implementation => {
            if (!isQingkuaiFileName(implementation.fileName)) {
                return true
            }

            const interIndex = implementation.textSpan.start
            const implementationLocationConvertor = adapter.service.createLocationConvertor(
                implementation.fileName
            )
            implementation.contextSpan =
                implementation.contextSpan &&
                implementationLocationConvertor.textSpan.toSourceTextSpan(
                    implementation.contextSpan
                )
            implementation.textSpan = implementationLocationConvertor.textSpan.toSourceTextSpan(
                implementation.textSpan
            )
            return (
                implementation.textSpan !== implementationLocationConvertor.textSpan.defaultValue &&
                implementationLocationConvertor.lineAndCharacter.fromInterIndex(interIndex).line > 2
            )
        })
    }
}
