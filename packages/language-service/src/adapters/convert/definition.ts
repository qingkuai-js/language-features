import type { AdapterTsProject } from "../../types/adapter"

import type {
    FindDefinitionsResult,
    TPICCommonRequestParams,
    FindDefinitionsResultItem
} from "../../../../../types/communication"
import type { TypescriptAdapter } from "../adapter"
import type { Range } from "vscode-languageserver-types"

import { debugAssert, isQingkuaiFileName } from "../../../../../shared-util/assert"

// 待办：优先使用 originFileName、originTextSpan 以及 originContextSpan 以支持 .d.ts.map 映射文件

export function getAndConvertDefinitions(
    adapter: TypescriptAdapter,
    params: TPICCommonRequestParams
): FindDefinitionsResult | null {
    const filePath = adapter.getNormalizedPath(params.fileName)
    const languageService = adapter.getDefaultLanguageService(filePath)!
    if (!debugAssert(languageService)) {
        return null
    }

    /**
     * 返回值已被 {@link proxyGetDefinitionAndBoundSpanToConvert} 处理，
     * `data.defintions` 中的所有项目的位置信息都是基于原始代码的，无需进行索引映射
     */
    const data = languageService.getDefinitionAndBoundSpan(filePath, params.pos)
    if (!data?.definitions) {
        return null
    }

    const locationConvertor = adapter.service.createLocationConvertor(filePath)
    const dealtDefinitions = data.definitions.map(definition => {
        const definitionLocationConvertor = adapter.service.createLocationConvertor(
            definition.fileName
        )
        const range = definitionLocationConvertor.languageServerRange.fromSourceTextSpan(
            definition.textSpan
        )
        if (definition.contextSpan) {
            const contextRange =
                definition.contextSpan &&
                definitionLocationConvertor.languageServerRange.fromSourceTextSpan(
                    definition.contextSpan
                )
            return {
                fileName: definition.fileName,
                targetSelectionRange: range,
                targetRange: contextRange ?? range
            }
        }
        return {
            fileName: definition.fileName,
            targetSelectionRange: range,
            targetRange: range
        }
    })
    return {
        definitions: dealtDefinitions,
        range: locationConvertor.languageServerRange.fromTextSpan(data.textSpan)
    }
}

export function getAndConvertTypeDefinitions(
    adapter: TypescriptAdapter,
    params: TPICCommonRequestParams
): FindDefinitionsResultItem[] | null {
    const filePath = adapter.getNormalizedPath(params.fileName)
    const languageService = adapter.getDefaultLanguageService(filePath)!
    if (!debugAssert(languageService)) {
        return null
    }

    /**
     * 返回值已被 {@link proxyGetTypeDefinitionAtPositionToConvert} 处理，
     * `definitions` 中的所有位置信息都是基于原始代码的，无需进行索引映射
     */
    const definitions = languageService.getTypeDefinitionAtPosition(filePath, params.pos)
    if (!definitions?.length) {
        return null
    }

    return definitions.map(definition => {
        let contextRange: Range | undefined = undefined
        const definitionFilePath = adapter.getNormalizedPath(definition.fileName)
        const definitionLocationConvertor =
            adapter.service.createLocationConvertor(definitionFilePath)
        const range = definitionLocationConvertor.languageServerRange.fromTextSpan(
            definition.textSpan
        )
        if (definition.contextSpan) {
            contextRange = definitionLocationConvertor.languageServerRange.fromTextSpan(
                definition.contextSpan
            )
        }

        return {
            fileName: filePath,
            targetRange: range,
            targetSelectionRange: contextRange ?? range
        }
    })
}

export function proxyGetDefinitionAndBoundSpanToConvert(
    adapter: TypescriptAdapter,
    project: AdapterTsProject
) {
    const languageService = project.getLanguageService()
    const getDefinitionAndBoundSpan = languageService.getDefinitionAndBoundSpan
    languageService.getDefinitionAndBoundSpan = (fileName, position) => {
        const originalRet = getDefinitionAndBoundSpan.call(languageService, fileName, position)
        if (!originalRet?.definitions) {
            return
        }
        originalRet.definitions.forEach(definition => {
            if (isQingkuaiFileName(definition.fileName)) {
                const definitionLocationConvertor = adapter.service.createLocationConvertor(
                    definition.fileName
                )
                definition.textSpan = definitionLocationConvertor.textSpan.toSourceTextSpan(
                    definition.textSpan
                )
                definition.contextSpan =
                    definition.contextSpan &&
                    definitionLocationConvertor.textSpan.toSourceTextSpan(definition.contextSpan)
            }
        })
        return originalRet
    }
}

export function proxyGetTypeDefinitionAtPositionToConvert(
    adapter: TypescriptAdapter,
    project: AdapterTsProject
) {
    const languageService = project.getLanguageService()
    const getTypeDefinitionAtPosition = languageService.getTypeDefinitionAtPosition
    languageService.getTypeDefinitionAtPosition = (fileName, position) => {
        const originalRet = getTypeDefinitionAtPosition.call(languageService, fileName, position)
        originalRet?.forEach(definition => {
            if (isQingkuaiFileName(definition.fileName)) {
                const definitionLocationConvertor = adapter.service.createLocationConvertor(
                    definition.fileName
                )
                definition.textSpan = definitionLocationConvertor.textSpan.toSourceTextSpan(
                    definition.textSpan
                )
                definition.contextSpan =
                    definition.contextSpan &&
                    definitionLocationConvertor.textSpan.toSourceTextSpan(definition.contextSpan)
            }
        })
        return originalRet
    }
}
