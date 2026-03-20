import type { Location } from "vscode-languageserver-types"
import type { CompileResult } from "../../../../types/common"
import type { FindScriptReferencesFunc } from "../types/service"

import { URI } from "vscode-uri"
import { PositionFlag } from "qingkuai/compiler"
import { excuteCssCommonHandler } from "../util/css"
import { isIndexesInvalid } from "../../../../shared-util/qingkuai"
import { findTemplateNodeAt, findTagNameRanges } from "../util/qingkuai"

export async function findReferences(
    cr: CompileResult,
    offset: number,
    findScriptReferences: FindScriptReferencesFunc
): Promise<Location[] | null> {
    if (cr.isPositionFlagSetAtIndex(PositionFlag.InStyle, offset)) {
        return excuteCssCommonHandler("findReferences", cr, offset)
    }

    const surroundingNode = findTemplateNodeAt(cr.templateNodes, offset)
    if (
        (surroundingNode?.tag === "slot" &&
            !cr.getTemplateNodeContext(surroundingNode).attributesMap.name) ||
        (surroundingNode?.isEmbedded && /[jt]s$/.test(surroundingNode.tag))
    ) {
        const tagNameRanges = findTagNameRanges(surroundingNode, offset)
        if (!tagNameRanges.start) {
            return null
        }
        offset = tagNameRanges.start[0]
    }

    const interIndex = cr.getInterIndex(offset)
    if (isIndexesInvalid(interIndex)) {
        return null
    }

    const references = await findScriptReferences(cr.filePath, interIndex)
    if (!references?.length) {
        return null
    }

    return references.map(item => {
        return {
            range: item.range,
            uri: URI.file(item.fileName).toString()
        } satisfies Location
    })
}
