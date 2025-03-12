import type { DefinitionHandler } from "../types/handlers"
import type { LocationLink, Position, Range } from "vscode-languageserver"
import type { FindDefinitionParams, FindDefinitionResult } from "../../../../types/communication"

import { resolve } from "path"
import { pathToFileURL } from "url"
import { getCompileRes, walk } from "../compile"
import { NumNum } from "../../../../types/common"
import { ensureGetTextDocument } from "./document"
import { connection, documents, tpic } from "../state"
import { isArray } from "../../../../shared-util/assert"
import { findAttribute, findNodeAt, findTagRanges } from "../util/qingkuai"

export const findDefinition: DefinitionHandler = async ({ textDocument, position }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    const cr = await getCompileRes(document)
    const offset = document.offsetAt(position)
    const { interIndexMap, isPositionFlagSet, templateNodes, getRange, getSourceIndex } = cr

    let interIndex = interIndexMap.stoi[offset]
    let originSelectionRange: Range | undefined = undefined
    if (!isPositionFlagSet(offset, "inScript")) {
        const currentNode = findNodeAt(templateNodes, offset)
        if (!currentNode || !(currentNode.componentTag || currentNode.parent?.componentTag)) {
            return null
        }

        const tagRanges = findTagRanges(currentNode, offset)
        if (tagRanges[0]) {
            if (!currentNode.componentTag) {
                return null
            }
            interIndex = interIndexMap.stoi[currentNode.range[0]]
            originSelectionRange = getRange(...tagRanges[offset < tagRanges[0][1] ? 0 : 1]!)
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

                const componentFileName = resolve(cr.filePath, "../", componentInfo.relativePath)
                return await getComponentSlotDefinition(
                    componentFileName,
                    attribute.value.raw,
                    getRange(attribute.loc.start.index, attribute.loc.end.index)
                )
            }

            const keyEndIndex = attribute.key.loc.end.index
            const keyStartIndex = attribute.key.loc.start.index
            if (offset >= keyEndIndex || offset < keyStartIndex) {
                return null
            }
            interIndex = interIndexMap.stoi[keyStartIndex]
            originSelectionRange = getRange(keyStartIndex, keyEndIndex)
        }
    }

    if (interIndex === -1) {
        return null
    }

    const preferGoToSourceDefinition: boolean = await connection.sendRequest(
        "qingkuai/getConfiguration",
        [
            cr.inputDescriptor.script.isTS ? "typescript" : "javascript",
            "preferGoToSourceDefinition",
            false
        ]
    )

    const res = await tpic.sendRequest<FindDefinitionParams, FindDefinitionResult | null>(
        "findDefinition",
        {
            pos: interIndex,
            fileName: cr.filePath,
            preferGoToSourceDefinition
        }
    )
    if (!res) {
        return null
    }

    if (!originSelectionRange) {
        originSelectionRange = getRange(
            getSourceIndex(res.range[0]),
            getSourceIndex(res.range[1], true)
        )
    }

    const locationLinks: LocationLink[] = []
    const defaultPosition: Position = { line: 0, character: 0 }
    const defaultRange: Range = { start: defaultPosition, end: defaultPosition }
    for (const definition of res.definitions) {
        let targetRange: Range
        let targetSelectionRange: Range | undefined = undefined
        if (!isArray(definition.targetRange)) {
            targetRange = definition.targetRange
            targetSelectionRange = definition.targetSelectionRange as any
        } else {
            const document = ensureGetTextDocument(pathToFileURL(definition.fileName).toString())
            const { getRange, getSourceIndex } = await getCompileRes(document)
            const ss1 = getSourceIndex(definition.targetRange[0])
            const se1 = getSourceIndex(definition.targetRange[1], true)
            if (!ss1 || !se1 || ss1 === -1 || se1 === -1) {
                targetRange = defaultRange
            } else {
                targetRange = getRange(ss1, se1)
            }

            if (definition.targetSelectionRange) {
                const ss2 = getSourceIndex((definition.targetSelectionRange as NumNum)[0])
                const se2 = getSourceIndex((definition.targetSelectionRange as NumNum)[1], true)
                if (!ss2 || !se2 || ss2 === -1 || se2 === -1) {
                    targetSelectionRange = defaultRange
                } else {
                    targetSelectionRange = getRange(ss2, se2)
                }
            }
        }

        if (!targetSelectionRange) {
            targetSelectionRange = targetRange
        }

        locationLinks.push({
            targetRange,
            targetSelectionRange,
            originSelectionRange,
            targetUri: `file://${definition.fileName}`
        })
    }
    return locationLinks
}

async function getComponentSlotDefinition(
    componentFileName: string,
    slotName: string,
    originSelectionRange: Range
) {
    const componentFileUri = `file://${componentFileName}`
    const cr = await getCompileRes(ensureGetTextDocument(componentFileUri))
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
