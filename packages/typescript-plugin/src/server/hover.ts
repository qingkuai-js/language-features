import type { NumNum } from "../../../../types/common"
import type { TPICCommonRequestParams, HoverTipResult } from "../../../../types/communication"

import {
    getNodeAt,
    getDefaultProjectByFileName,
    convertDisplayPartsToPlainTextWithLink
} from "../util/typescript"
import { server, ts } from "../state"
import { isComponentIdentifier } from "../util/qingkuai"
import { isUndefined } from "../../../../shared-util/assert"
import { mdCodeBlockGen } from "../../../../shared-util/docs"
import { TPICHandler } from "../../../../shared-util/constant"

export function attachHoverTip() {
    server.onRequest<TPICCommonRequestParams, HoverTipResult | null>(
        TPICHandler.HoverTip,
        ({ fileName, pos }) => {
            const project = getDefaultProjectByFileName(fileName)!
            const languageService = project.getLanguageService()
            const program = languageService.getProgram()!
            const typeChecker = program.getTypeChecker()

            const node = getNodeAt(program.getSourceFile(fileName)!, pos)
            if (
                node &&
                ts.isIdentifier(node) &&
                isComponentIdentifier(fileName, node, typeChecker)
            ) {
                return {
                    posRange: [node.getStart(), node.getEnd()],
                    content: mdCodeBlockGen("ts", `(component) class ${node.text}`)
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

            const ret = project.getLanguageService().getQuickInfoAtPosition(fileName, pos)
            if (isUndefined(ret)) {
                return null
            }

            const { start, length } = ret.textSpan
            const display = convertDisplayPartsToPlainTextWithLink(ret.displayParts)
            const documentation = convertDisplayPartsToPlainTextWithLink(ret.documentation)
            return {
                posRange: [start, start + length] as NumNum,
                content: mdCodeBlockGen("ts", display) + "\n" + documentation
            }
        }
    )
}
