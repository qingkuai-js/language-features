import type {
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type { ReferenceHandler } from "../types/handlers"
import type { Location } from "vscode-languageserver/node"

import { documents, tpic } from "../state"
import { getCompileRes, walk } from "../compile"
import { ensureGetTextDocument } from "./document"
import { filePathToComponentName } from "../../../../shared-util/qingkuai"
import { findAttribute, findNodeAt, findTagRanges } from "../util/qingkuai"
import { EXPORT_DEFAULT_OFFSET, TPICHandler } from "../../../../shared-util/constant"

export const findReference: ReferenceHandler = async ({ textDocument, position }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    const cr = await getCompileRes(document)
    const offset = document.offsetAt(position)

    let searchingSlotName = ""
    let interIndex = cr.getInterIndex(offset)
    if (!cr.isPositionFlagSet(interIndex, "inScript")) {
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
    }

    const references: FindReferenceResultItem[] | null =
        await tpic.sendRequest<TPICCommonRequestParams>(TPICHandler.FindReference, {
            pos: interIndex,
            fileName: cr.filePath
        })

    if (!references?.length) {
        return null
    }

    if (searchingSlotName) {
        return await findSlotReferences(
            references,
            searchingSlotName,
            filePathToComponentName(cr.filePath)
        )
    }

    return references.map(item => {
        return {
            range: item.range,
            uri: `file://${item.fileName}`
        } satisfies Location
    })
}

export async function findSlotReferences(
    references: FindReferenceResultItem[],
    slotName: string,
    componentTag: string
) {
    const filteredReferences = references.filter(item => {
        return item.fileName.endsWith(".qk")
    })
    if (filteredReferences.length === 0) {
        return null
    }

    const result: Location[] = []
    for (const fileName of new Set(filteredReferences.map(r => r.fileName))) {
        const uri = `file://${fileName}`
        const cr = await getCompileRes(ensureGetTextDocument(uri))
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
