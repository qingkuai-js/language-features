import type {
    GetCompileResultFunc,
    FindScriptDefinitionsFunc,
    FindScriptTypeDefinitionsFunc
} from "../types/service"
import type { CompileResult, CustomPath, NumNum } from "../../../../types/common"
import type { LocationLink, Range } from "vscode-languageserver-types"

import { URI } from "vscode-uri"
import { excuteCssCommonHandler } from "../util/css"
import { isIndexesInvalid } from "../../../../shared-util/qingkuai"
import { findAttribute, findNodeAt, findTagRanges, walk } from "../util/qingkuai"

export async function findDefinitions(
    cr: CompileResult,
    offset: number,
    path: CustomPath,
    getCompileRes: GetCompileResultFunc,
    findScriptDefinitions: FindScriptDefinitionsFunc
) {
    if (cr.isPositionFlagSet(offset, "inStyle")) {
        return excuteCssCommonHandler("findDefinition", cr, offset)
    }

    let interIndex = cr.getInterIndex(offset)
    let originSelectionRange: Range | undefined = undefined
    if (!cr.isPositionFlagSet(offset, "inScript")) {
        const currentNode = findNodeAt(cr.templateNodes, offset)
        if (!currentNode || !(currentNode.componentTag || currentNode.parent?.componentTag)) {
            return null
        }

        const tagRanges = findTagRanges(currentNode, offset)
        if (tagRanges[0]) {
            if (!currentNode.componentTag) {
                return null
            }
            interIndex = cr.getInterIndex(currentNode.range[0])
            originSelectionRange = cr.getRange(...tagRanges[offset < tagRanges[0][1] ? 0 : 1]!)
        } else {
            const attribute = findAttribute(offset, currentNode)
            if (!attribute || attribute.key.raw.startsWith("#")) {
                return null
            }

            if (currentNode.parent?.componentTag && attribute.key.raw === "slot") {
                const componentInfo = cr.componentInfos.find(info => {
                    return info.name === currentNode.parent!.componentTag
                })
                if (!componentInfo) {
                    return null
                }

                const componentFileName = path.resolve(
                    cr.filePath,
                    "../",
                    componentInfo.relativePath
                )
                return await getComponentSlotDefinition(
                    getCompileRes,
                    componentFileName,
                    attribute.value.raw,
                    cr.getRange(attribute.loc.start.index, attribute.loc.end.index)
                )
            }

            const keyEndIndex = attribute.key.loc.end.index
            const keyStartIndex = attribute.key.loc.start.index
            if (offset >= keyEndIndex || offset < keyStartIndex) {
                return null
            }
            interIndex = cr.getInterIndex(keyStartIndex)
            originSelectionRange = cr.getRange(keyStartIndex, keyEndIndex)
        }
    }

    if (isIndexesInvalid(interIndex)) {
        return null
    }

    const res = await findScriptDefinitions?.(cr, interIndex)
    if (!res?.definitions.length) {
        return null
    }
    if (!originSelectionRange) {
        originSelectionRange = res.range
    }
    return res.definitions.map(item => {
        return {
            originSelectionRange,
            targetRange: item.targetRange,
            targetUri: URI.file(item.fileName).toString(),
            targetSelectionRange: item.targetSelectionRange
        }
    })
}

export async function findTypeDefinitions(
    cr: CompileResult,
    offset: number,
    findTypeDefinitions: FindScriptTypeDefinitionsFunc
) {
    if (!cr.isPositionFlagSet(offset, "inScript")) {
        return null
    }

    const definitions = await findTypeDefinitions(cr.filePath, cr.getInterIndex(offset))
    if (!definitions?.length) {
        return null
    }
    return definitions.map(item => {
        return {
            targetRange: item.targetRange,
            targetUri: URI.file(item.fileName).toString(),
            targetSelectionRange: item.targetSelectionRange
        }
    })
}

async function getComponentSlotDefinition(
    getCompileRes: GetCompileResultFunc,
    componentFileName: string,
    slotName: string,
    originSelectionRange: Range
) {
    const cr = await getCompileRes(componentFileName)
    const componentFileUri = URI.file(componentFileName).toString()
    return walk<LocationLink[]>(cr.templateNodes, node => {
        if (node.tag === "slot") {
            const nameAttr = node.attributes.find(attr => {
                return attr.key.raw === "name"
            })
            if ((nameAttr?.value.raw || "default") === slotName) {
                const selectionRange: NumNum = nameAttr
                    ? [nameAttr.loc.start.index, nameAttr.loc.end.index]
                    : [node.range[0], node.range[0] + node.tag.length + 1]
                return [
                    {
                        originSelectionRange,
                        targetUri: componentFileUri,
                        targetRange: cr.getRange(...node.range),
                        targetSelectionRange: cr.getRange(...selectionRange)
                    }
                ]
            }
        }
        return undefined
    })
}
