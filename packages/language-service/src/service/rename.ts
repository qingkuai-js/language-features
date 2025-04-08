import type {
    GetCompileResultFunc,
    RenameInScriptBlockFunc,
    PrepareRenameInScriptBlockFunc
} from "../types/service"
import type { CompileResult } from "../../../../types/common"
import type { Range, TextEdit, WorkspaceEdit } from "vscode-languageserver-types"

import {
    cssLanguageService,
    excuteCssCommonHandler,
    createStyleSheetAndDocument
} from "../util/css"
import { URI } from "vscode-uri"
import { util } from "qingkuai/compiler"
import { isIndexesInvalid } from "../../../../shared-util/qingkuai"
import { isEmptyString, isUndefined } from "../../../../shared-util/assert"
import { findAttribute, findNodeAt, findTagRanges } from "../util/qingkuai"

export async function rename(
    cr: CompileResult,
    offset: number,
    newName: string,
    getCompileRes: GetCompileResultFunc,
    renameInScriptBlock: RenameInScriptBlockFunc
): Promise<WorkspaceEdit | null> {
    if (cr.isPositionFlagSet(offset, "inStyle")) {
        const [sd, sp, ss] = createStyleSheetAndDocument(cr, offset)!
        return cssLanguageService.doRename(sd, sp, newName, ss)
    }
    if (cr.isPositionFlagSet(offset, "inScript")) {
        return await doScriptBlockRename(
            cr,
            offset,
            newName,
            false,
            getCompileRes,
            renameInScriptBlock
        )
    }

    const currentNode = findNodeAt(cr.templateNodes, offset)
    if (isUndefined(currentNode) || isEmptyString(currentNode.tag)) {
        return null
    }

    const textEdits: TextEdit[] = []
    const tagRanges = findTagRanges(currentNode, offset, true)

    // 组件标签重命名
    if (currentNode.componentTag) {
        let interIndex: number | undefined = undefined
        if (tagRanges[0]) {
            interIndex = cr.getInterIndex(currentNode.range[0])
        } else {
            const currentAttribute = findAttribute(offset, currentNode)
            if (currentAttribute) {
                interIndex = cr.getInterIndex(currentAttribute.key.loc.start.index)
            }
        }
        if (isUndefined(interIndex)) {
            return null
        }
        return doScriptBlockRename(
            cr,
            interIndex,
            util.kebab2Camel(newName),
            true,
            getCompileRes,
            renameInScriptBlock
        )
    }

    // HTML标签重命名
    tagRanges.forEach(range => {
        if (!isUndefined(range)) {
            textEdits.push({
                newText: newName,
                range: cr.getRange(...range)
            })
        }
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
    if (cr.isPositionFlagSet(offset, "inStyle")) {
        return excuteCssCommonHandler("prepareRename", cr, offset) ?? null
    }
    if (cr.isPositionFlagSet(offset, "inScript")) {
        return await prepareScriptBlockRename(cr, offset, prepareRenameInScriptBlock)
    }

    const currentNode = findNodeAt(cr.templateNodes, offset)
    if (isUndefined(currentNode) || isEmptyString(currentNode)) {
        return null
    }

    if (currentNode.componentTag) {
        const currentAttribute = findAttribute(offset, currentNode)
        if (currentAttribute && currentAttribute.key.raw[0] !== "#") {
            const delta = +/[!@&]/.test(currentAttribute.key.raw)
            return cr.getRange(
                currentAttribute.key.loc.start.index + delta,
                currentAttribute.key.loc.end.index
            )
        }
    }

    const tagRanges = findTagRanges(currentNode, offset, true)
    if (!isUndefined(tagRanges[0])) {
        return cr.getRange(...tagRanges[offset <= tagRanges[0][1] ? 0 : 1]!)
    }
    return null
}

async function doScriptBlockRename(
    cr: CompileResult,
    offset: number,
    newName: string,
    isInterOffset: boolean,
    getCompileRes: GetCompileResultFunc,
    renameInScriptBlock: RenameInScriptBlockFunc
): Promise<WorkspaceEdit | null> {
    const textEdits: Record<string, TextEdit[]> = {}
    const locations = await renameInScriptBlock(
        cr.filePath,
        isInterOffset ? offset : cr.getInterIndex(offset)
    )
    if (!locations?.length) {
        return null
    }

    for (const item of locations) {
        const uri = URI.file(item.fileName).toString()
        const existing = textEdits[uri] || (textEdits[uri] = [])
        let newText = (item.prefix || "") + newName + (item.suffix || "")
        if (item.loc) {
            existing.push({
                range: item.loc,
                newText: util.kebab2Camel(newText)
            })
            continue
        }

        let [start, end] = item.range!
        const cr = await getCompileRes(item.fileName)
        const prettierConfig = cr.config.prettierConfig
        const { isPositionFlagSet, getRange, templateNodes } = cr
        if (!isPositionFlagSet(start, "inScript")) {
            if (isPositionFlagSet(start, "isComponentStart")) {
                const currentNode = findNodeAt(templateNodes, start + 1)
                if (!currentNode) {
                    continue
                }

                findTagRanges(currentNode, start + 1, true).forEach(range => {
                    const useKebab = prettierConfig?.componentTagFormatPreference === "kebab"
                    if (range) {
                        existing.push({
                            range: getRange(...range),
                            newText: useKebab
                                ? util.camel2Kebab(newText)
                                : util.kebab2Camel(newText)
                        })
                    }
                })
                continue
            }

            // 若修改项目为组件属性修改，则将属性名修改为驼峰格式（若为插值属性需将开始位置+1）
            if (isPositionFlagSet(start, "isAttributeStart")) {
                const useKebab = prettierConfig?.componentAttributeFormatPreference === "kebab"
                newText = useKebab ? util.camel2Kebab(newText) : util.kebab2Camel(newText)
                if (/[!@&]/.test(cr.inputDescriptor.source[start])) {
                    start++
                }
            }
        }

        existing.push({ newText, range: getRange(start, end) })
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

    const ss = cr.getSourceIndex(posRange[0])
    const se = cr.getSourceIndex(posRange[1], true)
    return isIndexesInvalid(ss, se) ? null : cr.getRange(ss, se)
}
