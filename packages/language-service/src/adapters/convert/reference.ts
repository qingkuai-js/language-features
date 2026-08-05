import type TS from "typescript"
import type { AdapterTsProject } from "../../types/adapter"

import type {
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../../types/communication"
import type { TypescriptAdapter } from "../adapter"

import { debugAssert, isQingkuaiFileName } from "../../../../../shared-util/assert"
import { getNodeAtPositionWithin, isComponentFuncReturns } from "../ts-ast"

// 待办：优先使用 originFileName、originTextSpan 以及 originContextSpan 以支持 .d.ts.map 映射文件

export function getAndConvertReferences(
    adapter: TypescriptAdapter,
    params: TPICCommonRequestParams
): FindReferenceResultItem[] | null {
    const result: FindReferenceResultItem[] = []
    const filePath = adapter.getNormalizedPath(params.fileName)
    const languageService = adapter.getDefaultLanguageService(filePath)!
    if (!debugAssert(languageService)) {
        return null
    }

    /**
     * 返回值已被 {@link proxyFindReferencesToConvert} 处理，所有 reference 项的位置信息都是基于源码的，无需进行索引映射
     */
    const data = languageService.findReferences(filePath, params.pos)
    data?.forEach(item => {
        item.references.forEach(reference => {
            if (reference.isDefinition) {
                return
            }

            const referenceLocationConvertor = adapter.service.createLocationConvertor(
                reference.fileName
            )
            result.push({
                range: referenceLocationConvertor.languageServerRange.fromSourceTextSpan(
                    reference.textSpan
                ),
                fileName: adapter.getNormalizedPath(reference.fileName)
            })
        })
    })
    return result
}

export function proxyFindReferencesToConvert(
    adapter: TypescriptAdapter,
    project: AdapterTsProject
) {
    const languageService = project.getLanguageService()
    const findReferences = languageService.findReferences
    languageService.findReferences = (fileName, position) => {
        const result: TS.ReferencedSymbol[] = []
        const originalRet = findReferences.call(languageService, fileName, position)

        // 当查找到的引用是组件导出时，再次查找引用并追加到结果中
        originalRet?.forEach(item => {
            item.references.forEach(reference => {
                if (reference.fileName !== fileName) {
                    return
                }

                const sourceFile = languageService.getProgram()?.getSourceFile(reference.fileName)
                const node =
                    sourceFile && getNodeAtPositionWithin(sourceFile, reference.textSpan.start)
                if (!node || !adapter.ts.isIdentifier(node) || !isComponentFuncReturns(node)) {
                    return
                }
                originalRet.push(
                    ...(findReferences.call(languageService, fileName, node.getStart()) ?? [])
                )
            })
        })

        originalRet?.forEach(item => {
            item.references = item.references.filter(reference => {
                if (!isQingkuaiFileName(reference.fileName)) {
                    return true
                }

                const referenceLocationConvertor = adapter.service.createLocationConvertor(
                    reference.fileName
                )
                reference.textSpan = referenceLocationConvertor.textSpan.toSourceTextSpan(
                    reference.textSpan
                )
                reference.contextSpan =
                    reference.contextSpan &&
                    referenceLocationConvertor.textSpan.toSourceTextSpan(reference.contextSpan)
                return reference.textSpan !== referenceLocationConvertor.textSpan.defaultValue
            })
        })
        return originalRet
    }
}
