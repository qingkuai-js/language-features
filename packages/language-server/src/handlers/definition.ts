import type {
    FindDefinitionParams,
    FindDefinitionResult,
    GetConfigurationParams,
    TPICCommonRequestParams,
    FindDefinitionResultItem
} from "../../../../types/communication"
import type { LocationLink, Range } from "vscode-languageserver/node"
import type { DefinitionHandler, TypeDefinitionHandler } from "../types/handlers"

import { resolve } from "node:path"
import { getCompileRes, walk } from "../compile"
import { NumNum } from "../../../../types/common"
import { ensureGetTextDocument } from "./document"
import { connection, documents, tpic } from "../state"
import { findAttribute, findNodeAt, findTagRanges } from "../util/qingkuai"

export const findDefinition: DefinitionHandler = async ({ textDocument, position, workDoneToken }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    const cr = await getCompileRes(document)
    const offset = document.offsetAt(position)
    const { getRange, getSourceIndex, getInterIndex } = cr

    let interIndex = getInterIndex(offset)
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
            interIndex = getInterIndex(currentNode.range[0])
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
            interIndex = getInterIndex(keyStartIndex)
            originSelectionRange = getRange(keyStartIndex, keyEndIndex)
        }
    }

    if (interIndex === -1) {
        return null
    }

    const preferGoToSourceDefinition: boolean = await connection.sendRequest(
        "qingkuai/getConfiguration",
        {
            defaultValue: false,
            uri: textDocument.uri,
            section: cr.scriptLanguageId,
            name: "preferGoToSourceDefinition"
        } satisfies GetConfigurationParams<boolean>
    )

    const res: FindDefinitionResult | null = await tpic.sendRequest<FindDefinitionParams>(
        "findDefinition",
        {
            pos: interIndex,
            fileName: cr.filePath,
            preferGoToSourceDefinition
        }
    )
    if (!res?.definitions.length) {
        return null
    }

    if (!originSelectionRange) {
        originSelectionRange = getRange(
            getSourceIndex(res.range[0]),
            getSourceIndex(res.range[1], true)
        )
    }

    return res.definitions.map(item => {
        return {
            originSelectionRange,
            targetUri: `file://${item.fileName}`,
            targetRange: item.targetRange,
            targetSelectionRange: item.targetSelectionRange
        }
    })
}

export const findTypeDefinition: TypeDefinitionHandler = async (
    { textDocument, position },
    token
) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    const cr = await getCompileRes(document)
    const offset = document.offsetAt(position)
    if (!cr.isPositionFlagSet(offset, "inScript")) {
        return null
    }

    const definitions: FindDefinitionResultItem[] | null =
        await tpic.sendRequest<TPICCommonRequestParams>("findTypeDefinition", {
            fileName: cr.filePath,
            pos: cr.getInterIndex(offset)
        })

    if (!definitions?.length) {
        return null
    }

    return definitions.map(item => {
        return {
            targetRange: item.targetRange,
            targetUri: `file://${item.fileName}`,
            targetSelectionRange: item.targetSelectionRange
        }
    })
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
