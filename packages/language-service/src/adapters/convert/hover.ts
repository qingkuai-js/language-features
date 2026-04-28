import type TS from "typescript"

import type { TypescriptAdapter } from "../adapter"
import type { Pair } from "../../../../../types/common"
import type { AdapterTsProject } from "../../types/adapter"
import type { HoverTipResult, TPICCommonRequestParams } from "../../../../../types/communication"

import { ts } from "../state"
import { LSU_AND_DOT } from "../../constants"
import { mdCodeBlockGen } from "../../../../../shared-util/docs"
import { constants as qingkuaiConstants } from "qingkuai/compiler"
import { getNodeAtPositionAndWithin, isInTopScope } from "../ts-ast"
import { convertDisplayPartsToPlainTextWithLink } from "./documentation"
import { debugAssert, isUndefined } from "../../../../../shared-util/assert"

export function getAndConvertHoverTip(
    adapter: TypescriptAdapter,
    { fileName, pos }: TPICCommonRequestParams
): HoverTipResult | null {
    const fileInfo = adapter.service.ensureGetQingkuaiFileInfo(fileName)
    const program = adapter.getDefaultProgram(fileInfo.path)!
    if (!debugAssert(program)) {
        return null
    }

    let idStatusDisplay = ""
    const typeChecker = program.getTypeChecker()
    const config = adapter.getQingkuaiConfig(fileInfo.path)
    const languageService = adapter.getDefaultLanguageService(fileInfo.path)!
    const node = getNodeAtPositionAndWithin(program.getSourceFile(fileName)!, pos)

    if (node && ts.isIdentifier(node)) {
        const nodeRange: Pair<number> = [node.getStart(), node.getEnd()]

        // 顶部作用域标识符显示响应式状态
        if (config?.hoverTipReactiveStatus && fileInfo.idStatusInfo[node.text]) {
            const symbol = typeChecker.getSymbolAtLocation(node)
            if (
                symbol &&
                symbol.declarations &&
                !(symbol.flags & ts.SymbolFlags.Alias) &&
                symbol.declarations.some(decl => isInTopScope(decl))
            ) {
                const statusInfo = fileInfo.idStatusInfo[node.text]
                idStatusDisplay = ` // - ${statusInfo} -`
            }
        }

        if (node.text.startsWith(qingkuaiConstants.PRESERVED_IDPREFIX)) {
            return {
                content: "any",
                range: nodeRange
            }
        }

        // 待办：思考是否可以用一种更好的方式去除内部方法悬停提示
        if (
            node.parent &&
            ts.isPropertyAccessExpression(node.parent) &&
            node.parent.expression.getText() === qingkuaiConstants.LSC.UTIL
        ) {
            return {
                content: "any",
                range: nodeRange
            }
        }
    }

    const ret = languageService.getQuickInfoAtPosition(fileName, pos)
    if (isUndefined(ret)) {
        return null
    }

    const { start, length } = ret.textSpan
    const documentation = convertDisplayPartsToPlainTextWithLink(ret.documentation)
    const display = convertDisplayPartsToPlainTextWithLink(ret.displayParts).replace(
        LSU_AND_DOT,
        ""
    )
    return {
        range: [start, start + length] as Pair<number>,
        content: mdCodeBlockGen("ts", display + idStatusDisplay) + "\n" + documentation
    }
}

export function proxyGetQuickInfoAtPosition(_: TypescriptAdapter, project: AdapterTsProject) {
    const languageService = project.getLanguageService()
    const getQuickInfoAtPosition = languageService.getQuickInfoAtPosition
    languageService.getQuickInfoAtPosition = (fileName, position) => {
        const originalRet = getQuickInfoAtPosition.call(languageService, fileName, position)
        if (originalRet?.displayParts) {
            originalRet.displayParts = filterDisplayParts(originalRet.displayParts)
        }
        if (originalRet?.documentation) {
            originalRet.documentation = filterDisplayParts(originalRet.documentation)
        }
        return originalRet
    }
}

function filterDisplayParts(target: TS.SymbolDisplayPart[] | undefined) {
    return target?.filter((item, index) => {
        switch (item.text) {
            case qingkuaiConstants.LSC.UTIL:
            case qingkuaiConstants.LSC.COMPONENT:
            case qingkuaiConstants.PRESERVED_IDPREFIX:
            case qingkuaiConstants.LSC.GET_TYPE_DELAY_MARKING: {
                return false
            }
            case ".": {
                return target[index - 1].text !== qingkuaiConstants.LSC.UTIL
            }
            default: {
                return true
            }
        }
    })
}
