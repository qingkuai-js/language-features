import type { NumNum } from "../../../../types/common"
import type { WorkspaceEdit } from "vscode-languageserver/node"
import type { CachedCompileResultItem } from "../types/service"
import type { PrepareRename, RenameHandler } from "../types/handlers"
import type { RenameLocationItem, TPICCommonRequestParams } from "../../../../types/communication"

import { pathToFileURL } from "url"
import { util } from "qingkuai/compiler"
import { getCompileRes } from "../compile"
import { ensureGetTextDocument } from "./document"
import { TextEdit } from "vscode-languageserver/node"
import { documents, isTestingEnv, tpic, waittingCommands } from "../state"
import { isEmptyString, isUndefined } from "../../../../shared-util/assert"
import { findAttribute, findNodeAt, findTagRanges } from "../util/qingkuai"
import { TPICHandler } from "../../../../shared-util/constant"

export const rename: RenameHandler = async ({ textDocument, position, newName }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return
    }

    const cr = await getCompileRes(document)
    const { getRange, getOffset, templateNodes } = cr

    const offset = getOffset(position)
    if (cr.isPositionFlagSet(offset, "inScript")) {
        return doScriptBlockRename(cr, offset, newName)
    }

    const currentNode = findNodeAt(templateNodes, offset)
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
        return doScriptBlockRename(cr, interIndex, util.kebab2Camel(newName), true)
    }

    // HTML标签重命名
    tagRanges.forEach(range => {
        if (!isUndefined(range)) {
            textEdits.push(TextEdit.replace(getRange(...range), newName))
        }
    })
    if (textEdits.length > 0) {
        return {
            changes: {
                [textDocument.uri]: textEdits
            }
        }
    }
}

export const prepareRename: PrepareRename = async ({ textDocument, position }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    const cr = await getCompileRes(document)
    const { getRange, getOffset, templateNodes, getSourceIndex } = cr

    const offset = getOffset(position)
    if (!isTestingEnv && cr.isPositionFlagSet(offset, "inScript")) {
        const posRange = await tpic.sendRequest<TPICCommonRequestParams, NumNum>(
            TPICHandler.prepareRename,
            {
                fileName: cr.filePath,
                pos: cr.getInterIndex(offset)
            }
        )
        const ss = getSourceIndex(posRange[0])
        const se = getSourceIndex(posRange[1], true)
        if (ss && se && ss !== -1 && se !== -1) {
            return getRange(ss, se)
        }
        return null
    }

    const currentNode = findNodeAt(templateNodes, offset)
    if (isUndefined(currentNode) || isEmptyString(currentNode)) {
        return null
    }

    if (currentNode.componentTag) {
        const currentAttribute = findAttribute(offset, currentNode)
        if (currentAttribute && currentAttribute.key.raw[0] !== "#") {
            const delta = +/[!@&]/.test(currentAttribute.key.raw)
            return getRange(
                currentAttribute.key.loc.start.index + delta,
                currentAttribute.key.loc.end.index
            )
        }
    }

    const tagRanges = findTagRanges(currentNode, offset, true)
    if (!isUndefined(tagRanges[0])) {
        return getRange(...tagRanges[offset <= tagRanges[0][1] ? 0 : 1]!)
    }
}

async function doScriptBlockRename(
    cr: CachedCompileResultItem,
    offset: number,
    newName: string,
    isInterOffset = false
) {
    if (isTestingEnv) {
        return null
    }

    const textEdits: Record<string, TextEdit[]> = {}
    const locations: RenameLocationItem[] = await tpic.sendRequest<TPICCommonRequestParams>(
        TPICHandler.rename,
        {
            fileName: cr.filePath,
            pos: isInterOffset ? offset : cr.getInterIndex(offset)
        }
    )

    if (!locations.length) {
        return null
    }

    for (const item of locations) {
        const uri = pathToFileURL(item.fileName || "").toString()
        const existing = textEdits[uri] || (textEdits[uri] = [])
        let newText = (item.prefix || "") + newName + (item.suffix || "")
        if (item.loc) {
            waittingCommands.set("diagnostic", "updateOpen")
            existing.push(TextEdit.replace(item.loc, util.kebab2Camel(newText)))
            continue
        }

        let [start, end] = item.range!
        const document = ensureGetTextDocument(uri)
        const cr = await getCompileRes(document, false)
        const prettierConfig = cr.config.prettierConfig
        const { isPositionFlagSet, getRange, templateNodes } = cr
        if (!isPositionFlagSet(start, "inScript")) {
            if (isPositionFlagSet(start, "isComponentStart")) {
                const currentNode = findNodeAt(templateNodes, start + 1)
                if (!currentNode) {
                    continue
                }

                findTagRanges(currentNode, start + 1, true).forEach(range => {
                    const useKebab = prettierConfig.componentTagFormatPreference === "kebab"
                    if (range) {
                        existing.push(
                            TextEdit.replace(
                                getRange(...range),
                                useKebab ? util.camel2Kebab(newText) : util.kebab2Camel(newText)
                            )
                        )
                    }
                })
                continue
            }

            // 若修改项目为组件属性修改，则将属性名修改为驼峰格式（若为插值属性需将开始位置+1）
            if (isPositionFlagSet(start, "isAttributeStart")) {
                const useKebab = prettierConfig.componentAttributeFormatPreference === "kebab"
                newText = useKebab ? util.camel2Kebab(newText) : util.kebab2Camel(newText)
                if (/[!@&]/.test(document.getText()[start])) {
                    start++
                }
            }
        }

        existing.push(TextEdit.replace(getRange(start, end), newText))
    }

    return { changes: textEdits } satisfies WorkspaceEdit
}
