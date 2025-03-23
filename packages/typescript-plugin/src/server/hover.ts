import type { NumNum } from "../../../../types/common"
import type { TPICCommonRequestParams, HoverTipResult } from "../../../../types/communication"

import {
    getNodeAt,
    getDefaultProjectByFileName,
    convertDisplayPartsToPlainTextWithLink
} from "../util/typescript"
import { server, ts } from "../state"
import { isComponentIdentifier } from "../util/qingkuai"
import { isBuiltInGlobalDeclaration } from "../util/ast"
import { isUndefined } from "../../../../shared-util/assert"
import { mdCodeBlockGen } from "../../../../shared-util/docs"
import { GLOBAL_BUILTIN_VARS, INTER_NAMESPACE, TPICHandler } from "../../../../shared-util/constant"

export function attachHoverTip() {
    server.onRequest<TPICCommonRequestParams, HoverTipResult | null>(
        TPICHandler.HoverTip,
        ({ fileName, pos }) => {
            const project = getDefaultProjectByFileName(fileName)!
            const languageService = project.getLanguageService()
            const program = languageService.getProgram()!
            const typeChecker = program.getTypeChecker()

            let replacer: string | RegExp = ""
            const node = getNodeAt(program.getSourceFile(fileName)!, pos)
            if (node && ts.isIdentifier(node)) {
                const nodeRange: NumNum = [node.getStart(), node.getEnd()]
                if (
                    GLOBAL_BUILTIN_VARS.has(node.text) &&
                    isBuiltInGlobalDeclaration(node, typeChecker)
                ) {
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
                } else if (isComponentIdentifier(fileName, node, typeChecker)) {
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
                isComponentIdentifier(fileName, node.parent.expression, typeChecker)
            ) {
                return {
                    posRange: [node.parent.expression.getStart(), node.parent.expression.getEnd()],
                    content: mdCodeBlockGen(
                        "ts",
                        `(component) class ${node.parent.expression.text}`
                    )
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
    )
}
