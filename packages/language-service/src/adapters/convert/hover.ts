import type TS from "typescript"
import type { NumNum } from "../../../../../types/common"
import type { HoverTipResult, TPICCommonRequestParams } from "../../../../../types/communication"

import { ts } from "../state"
import { isUndefined } from "../../../../../shared-util/assert"
import { mdCodeBlockGen } from "../../../../../shared-util/docs"
import { getRealPath, isComponentIdentifier } from "../qingkuai"
import { getNodeAt, isBuiltInGlobalDeclaration } from "../ts-ast"
import { convertDisplayPartsToPlainTextWithLink } from "./typescript"
import { GLOBAL_BUILTIN_VARS, INTER_NAMESPACE } from "../../../../../shared-util/constant"

export function getAndConvertHoverTip(
    languageService: TS.LanguageService,
    { fileName, pos }: TPICCommonRequestParams
): HoverTipResult | null {
    let replacer: string | RegExp = ""
    const realPath = getRealPath(fileName)
    const program = languageService.getProgram()
    if (!program) {
        return null
    }

    const typeChecker = program.getTypeChecker()
    const node = getNodeAt(program.getSourceFile(fileName)!, pos)
    if (node && ts.isIdentifier(node)) {
        const nodeRange: NumNum = [node.getStart(), node.getEnd()]
        if (GLOBAL_BUILTIN_VARS.has(node.text) && isBuiltInGlobalDeclaration(node, typeChecker)) {
            replacer = INTER_NAMESPACE + "."
        } else if (node.text === INTER_NAMESPACE) {
            return {
                posRange: nodeRange,
                content: "any"
            }
        } else if (
            node.parent &&
            ts.isPropertyAccessExpression(node.parent) &&
            node.parent.expression.getText() === INTER_NAMESPACE
        ) {
            return {
                posRange: nodeRange,
                content: "any"
            }
        } else if (isComponentIdentifier(realPath, node, typeChecker)) {
            return {
                posRange: [node.getStart(), node.getEnd()],
                content: mdCodeBlockGen("ts", `(component) class ${node.text}`)
            }
        }
    }

    if (
        node &&
        node.parent &&
        ts.isNewExpression(node.parent) &&
        ts.isIdentifier(node.parent.expression) &&
        isComponentIdentifier(realPath, node.parent.expression, typeChecker)
    ) {
        return {
            posRange: [node.parent.expression.getStart(), node.parent.expression.getEnd()],
            content: mdCodeBlockGen("ts", `(component) class ${node.parent.expression.text}`)
        }
    }

    const ret = languageService.getQuickInfoAtPosition(fileName, pos)
    if (isUndefined(ret)) {
        return null
    }

    const { start, length } = ret.textSpan
    const display = convertDisplayPartsToPlainTextWithLink(ret.displayParts)
    const documentation = convertDisplayPartsToPlainTextWithLink(ret.documentation)
    return {
        posRange: [start, start + length] as NumNum,
        content: mdCodeBlockGen("ts", display.replace(replacer, "")) + "\n" + documentation
    }
}
