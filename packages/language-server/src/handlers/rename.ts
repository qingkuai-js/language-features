import type { NumNum } from "../../../../types/common"
import type { WorkspaceEdit } from "vscode-languageserver/node"
import type { CachedCompileResultItem } from "../types/service"
import type { PrepareRename, RenameHandler } from "../types/handlers"
import type { RenameLocationItem, TPICCommonRequestParams } from "../../../../types/communication"

import {
    tpic,
    documents,
    isTestingEnv,
    waittingCommands,
    cssLanguageService,
    limitedScriptLanguageFeatures
} from "../state"
import {
    findNodeAt,
    findTagRanges,
    findAttribute,
    createStyleSheetAndDocument
} from "../util/qingkuai"
import { URI } from "vscode-uri"
import { util } from "qingkuai/compiler"
import { getCompileRes } from "../compile"
import { excuteCSSLSHandler } from "../util/css"
import { ensureGetTextDocument } from "./document"
import { TextEdit } from "vscode-languageserver/node"
import { TPICHandler } from "../../../../shared-util/constant"
import { isIndexesInvalid } from "../../../../shared-util/qingkuai"
import { isEmptyString, isUndefined } from "../../../../shared-util/assert"

export const rename: RenameHandler = async ({ textDocument, position, newName }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return
    }

    const cr = await getCompileRes(document)
    const offset = cr.getOffset(position)
    if (cr.isPositionFlagSet(offset, "inStyle")) {
        const [sd, sp, ss] = createStyleSheetAndDocument(cr, offset)!
        return cssLanguageService.doRename(sd, sp, newName, ss)
    }
    if (cr.isPositionFlagSet(offset, "inScript")) {
        return await doScriptBlockRename(cr, offset, newName)
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
        return doScriptBlockRename(cr, interIndex, util.kebab2Camel(newName), true)
    }

    // HTML标签重命名
    tagRanges.forEach(range => {
        if (!isUndefined(range)) {
            textEdits.push(TextEdit.replace(cr.getRange(...range), newName))
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
    const offset = cr.getOffset(position)
    if (cr.isPositionFlagSet(offset, "inScript")) {
        return await scriptBlockPrepareRename(cr, offset)
    }
    if (cr.isPositionFlagSet(offset, "inStyle")) {
        return excuteCSSLSHandler("prepareRename", cr, offset)
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
}

async function doScriptBlockRename(
    cr: CachedCompileResultItem,
    offset: number,
    newName: string,
    isInterOffset = false
) {
    if (isTestingEnv || limitedScriptLanguageFeatures) {
        return null
    }

    const textEdits: Record<string, TextEdit[]> = {}
    const locations: RenameLocationItem[] = await tpic.sendRequest<TPICCommonRequestParams>(
        TPICHandler.Rename,
        {
            fileName: cr.filePath,
            pos: isInterOffset ? offset : cr.getInterIndex(offset)
        }
    )

    if (!locations.length) {
        return null
    }

    for (const item of locations) {
        const uri = URI.file(item.fileName).toString()
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

async function scriptBlockPrepareRename(cr: CachedCompileResultItem, offset: number) {
    const posRange = await tpic.sendRequest<TPICCommonRequestParams, NumNum>(
        TPICHandler.PrepareRename,
        {
            fileName: cr.filePath,
            pos: cr.getInterIndex(offset)
        }
    )
    const ss = cr.getSourceIndex(posRange[0])
    const se = cr.getSourceIndex(posRange[1], true)
    return isIndexesInvalid(ss, se) ? null : cr.getRange(ss, se)
}
