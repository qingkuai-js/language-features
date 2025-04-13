import type { Location } from "vscode-languageserver-types"
import type { CompileResult, CustomPath } from "../../../../types/common"
import type { FindReferenceResultItem } from "../../../../types/communication"
import type { FindScriptReferencesFunc, GetCompileResultFunc } from "../types/service"

import { URI } from "vscode-uri"
import { excuteCssCommonHandler } from "../util/css"
import { isQingkuaiFileName } from "../../../../shared-util/assert"
import { EXPORT_DEFAULT_OFFSET } from "../../../../shared-util/constant"
import { findAttribute, findNodeAt, findTagRanges, walk } from "../util/qingkuai"
import { filePathToComponentName, isIndexesInvalid } from "../../../../shared-util/qingkuai"

export async function findReferences(
    cr: CompileResult,
    offset: number,
    path: CustomPath,
    getCompileRes: GetCompileResultFunc,
    findScriptReferences: FindScriptReferencesFunc
): Promise<Location[] | null> {
    if (cr.isPositionFlagSet(offset, "inStyle")) {
        return excuteCssCommonHandler("findReferences", cr, offset)
    }

    let searchingSlotName = ""
    let interIndex = cr.getInterIndex(offset)
    const currentNode = findNodeAt(cr.templateNodes, offset)
    const e29x = cr.interIndexMap.itos.length + EXPORT_DEFAULT_OFFSET // Export Identifier Start Inter Index
    if (currentNode?.isEmbedded && findTagRanges(currentNode, offset)[0]) {
        if (!/[jt]s$/.test(currentNode.tag)) {
            return null
        }
        interIndex = e29x
    } else if (currentNode?.tag === "slot") {
        const attribute = findAttribute(offset, currentNode)
        if (attribute?.key.raw !== "name") {
            return null
        }
        searchingSlotName = attribute.value.raw
        interIndex = e29x
    }

    if (!isIndexesInvalid(interIndex)) {
        const references = await findScriptReferences(cr.filePath, interIndex)
        if (!references?.length) {
            return null
        }

        if (searchingSlotName) {
            return await findSlotReferences(
                references,
                getCompileRes,
                searchingSlotName,
                filePathToComponentName(path, cr.filePath)
            )
        }

        return references.map(item => {
            return {
                range: item.range,
                uri: URI.file(item.fileName).toString()
            } satisfies Location
        })
    }
    return null
}

export async function findSlotReferences(
    references: FindReferenceResultItem[],
    getCompileRes: GetCompileResultFunc,
    slotName: string,
    componentTag: string
) {
    const filteredReferences = references.filter(item => {
        return isQingkuaiFileName(item.fileName)
    })
    if (!filteredReferences.length) {
        return null
    }

    const result: Location[] = []
    for (const fileName of new Set(filteredReferences.map(r => r.fileName))) {
        const uri = URI.file(fileName).toString()
        const cr = await getCompileRes(fileName)
        walk(cr.templateNodes, node => {
            if (node.parent?.componentTag === componentTag) {
                const slotAttr = node.attributes.find(attr => {
                    return attr.key.raw === "slot"
                })
                if (slotAttr?.value.raw === slotName) {
                    result.push({
                        uri,
                        range: cr.getRange(slotAttr.key.loc.start.index, slotAttr.key.loc.end.index)
                    })
                }
            }
        })
    }

    return result
}
