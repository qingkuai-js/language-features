import type {
    GetCompileResultFunc,
    RenameInScriptBlockFunc,
    PrepareRenameInScriptBlockFunc
} from "../types/service"
import type { CompileResult } from "../../../../types/common"
import { TemplateAttribute, TemplateNode } from "qingkuai/compiler"
import type { Range, TextEdit, WorkspaceEdit } from "vscode-languageserver-types"

import { URI } from "vscode-uri"
import { stringifyRange } from "../util/sundry"
import { jsValidIdentifierRE } from "../regular"
import { PositionFlag, util } from "qingkuai/compiler"
import { traverseObject } from "../../../../shared-util/sundry"
import { isIndexesInvalid } from "../../../../shared-util/qingkuai"
import { isEmptyString, isUndefined } from "../../../../shared-util/assert"
import { excuteCssCommonHandler, createStyleSheetAndDocument } from "../util/css"
import { findTemplateAttribute, findTemplateNodeAt, findTagNameRanges } from "../util/qingkuai"

export async function rename(
    cr: CompileResult,
    offset: number,
    newName: string,
    getCompileRes: GetCompileResultFunc,
    renameInScriptBlock: RenameInScriptBlockFunc
): Promise<WorkspaceEdit | null> {
    if (cr.isPositionFlagSetAtIndex(PositionFlag.InStyle, offset)) {
        const [languageService, sd, sp, ss] = createStyleSheetAndDocument(cr, offset)
        return languageService.doRename(sd, sp, newName, ss)
    }
    if (cr.isPositionFlagSetAtIndex(PositionFlag.InScript, offset)) {
        return await doScriptBlockRename(cr, offset, newName, getCompileRes, renameInScriptBlock)
    }

    const currentNode = findTemplateNodeAt(cr.templateNodes, offset)
    if (isUndefined(currentNode) || isEmptyString(currentNode.tag)) {
        return null
    }

    const textEdits: TextEdit[] = []
    const tagNameRanges = findTagNameRanges(currentNode, offset, true)

    // 组件标签重命名
    if (currentNode.componentTag || currentNode.tag === "slot") {
        let interIndex = -1
        let sourceIndex = -1
        if (tagNameRanges.start) {
            if (jsValidIdentifierRE.test(newName)) {
                newName = newName[0].toUpperCase() + newName.slice(1)
            }
            interIndex = cr.getInterIndex((sourceIndex = currentNode.loc.start.index + 1))
        } else {
            const surroundingAttribute = findTemplateAttribute(offset, currentNode)
            if (surroundingAttribute) {
                const sourceLoc =
                    currentNode.tag === "slot" && surroundingAttribute?.name.raw === "name"
                        ? surroundingAttribute.value.loc
                        : surroundingAttribute.name.loc
                interIndex = cr.getInterIndex((sourceIndex = sourceLoc.start.index))
            }
        }
        if (isIndexesInvalid(interIndex)) {
            return null
        }
        return doScriptBlockRename(
            cr,
            sourceIndex,
            util.kebab2Camel(newName),
            getCompileRes,
            renameInScriptBlock
        )
    }

    // HTML标签重命名
    traverseObject(tagNameRanges, (_, range) => {
        textEdits.push({
            newText: newName,
            range: cr.getVscodeRange(...range!)
        })
    })
    if (textEdits.length > 0) {
        return {
            changes: {
                [cr.uri]: textEdits
            }
        }
    }
    return null
}

export async function prepareRename(
    cr: CompileResult,
    offset: number,
    prepareRenameInScriptBlock: PrepareRenameInScriptBlockFunc
): Promise<Range | null> {
    if (cr.isPositionFlagSetAtIndex(PositionFlag.InStyle, offset)) {
        return excuteCssCommonHandler("prepareRename", cr, offset) ?? null
    }
    if (cr.isPositionFlagSetAtIndex(PositionFlag.InScript, offset)) {
        return await prepareScriptBlockRename(cr, offset, prepareRenameInScriptBlock)
    }

    const currentNode = findTemplateNodeAt(cr.templateNodes, offset)
    if (isUndefined(currentNode) || isEmptyString(currentNode)) {
        return null
    }

    if (currentNode.componentTag || currentNode.tag === "slot") {
        const surroundingAttribute = findTemplateAttribute(offset, currentNode)
        if (surroundingAttribute) {
            return getComponentOrSlotAttributeRenameRange(cr, currentNode, surroundingAttribute)
        }
    }

    const tagNameRanges = findTagNameRanges(currentNode, offset, true)
    if (!isUndefined(tagNameRanges.start)) {
        return cr.getVscodeRange(
            ...tagNameRanges[offset <= tagNameRanges.start[1] ? "start" : "end"]!
        )
    }
    return null
}

async function doScriptBlockRename(
    cr: CompileResult,
    offset: number,
    newName: string,
    getCompileRes: GetCompileResultFunc,
    renameInScriptBlock: RenameInScriptBlockFunc
): Promise<WorkspaceEdit | null> {
    const locations = await renameInScriptBlock(cr.filePath, cr.getInterIndex(offset))
    if (!locations?.length) {
        return null
    }

    const existingRenameInfos = new Set<string>()
    const textEdits: Record<string, TextEdit[]> = {}

    for (const item of locations) {
        let newText = (item.prefix ?? "") + newName + (item.suffix ?? "")
        const uri = URI.file(item.fileName).toString()

        const extendTextEdit = (range: Range, newText: string) => {
            const existing = textEdits[uri] || (textEdits[uri] = [])
            const infoKey = `${uri}\0${stringifyRange(range)}`
            if (!existingRenameInfos.has(infoKey)) {
                existing.push({ range, newText })
            }
            existingRenameInfos.add(infoKey)
        }

        // 非 qk 文件
        if (item.loc) {
            extendTextEdit(item.loc, util.kebab2Camel(newText))
            continue
        }

        const [editStart, editEnd] = item.range!
        const targetCompileRes = await getCompileRes(item.fileName)
        const prettierConfig = targetCompileRes.config?.prettierConfig
        const useKebab = prettierConfig?.componentTagFormatPreference === "kebab"
        if (targetCompileRes.isPositionFlagSetAtIndex(PositionFlag.InScript, editStart)) {
            extendTextEdit(targetCompileRes.getVscodeRange(editStart, editEnd), newText)
            continue
        }

        const currentNode = findTemplateNodeAt(targetCompileRes.templateNodes, editStart)
        if (!currentNode) {
            continue
        }

        const surroundingAttribute = findTemplateAttribute(editStart, currentNode)
        if (surroundingAttribute) {
            const renameRange = getComponentOrSlotAttributeRenameRange(
                targetCompileRes,
                currentNode,
                surroundingAttribute
            )!
            if (currentNode.tag === "slot" && surroundingAttribute.name.raw === "name") {
                extendTextEdit(renameRange, newText)
            } else {
                extendTextEdit(
                    renameRange,
                    useKebab ? util.camel2Kebab(newText) : util.kebab2Camel(newText)
                )
            }

            continue
        }

        traverseObject(findTagNameRanges(currentNode, editStart, true), (_, range) => {
            extendTextEdit(
                targetCompileRes.getVscodeRange(...range!),
                useKebab ? util.camel2Kebab(newText) : util.kebab2Camel(newText)
            )
        })
        continue
    }

    return { changes: textEdits } satisfies WorkspaceEdit
}

async function prepareScriptBlockRename(
    cr: CompileResult,
    offset: number,
    prepareRenameInScriptBlock: PrepareRenameInScriptBlockFunc
): Promise<Range | null> {
    const posRange = await prepareRenameInScriptBlock(cr, cr.getInterIndex(offset))
    if (!posRange) {
        return null
    }

    const sourceStart = cr.getSourceIndex(posRange[0])
    const sourceEnd = cr.getSourceIndex(posRange[1])
    return isIndexesInvalid(sourceStart, sourceEnd)
        ? null
        : cr.getVscodeRange(sourceStart, sourceEnd)
}

function getComponentOrSlotAttributeRenameRange(
    cr: CompileResult,
    node: TemplateNode,
    attribute: TemplateAttribute
) {
    if (node.tag === "slot" && attribute?.name.raw === "name" && attribute.value.raw) {
        return cr.getVscodeRange(attribute.value.loc)
    }
    if (attribute && attribute.name.raw[0] !== "#") {
        const delta = +/[!@&]/.test(attribute.name.raw)
        return cr.getVscodeRange(
            attribute.name.loc.start.index + delta,
            attribute.name.loc.end.index
        )
    }
    return null
}
