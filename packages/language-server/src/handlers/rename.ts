import type {
    RenameResult,
    RenameLocationItem,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type { NumNum } from "../../../../types/common"
import type { PrepareRename, RenameHandler } from "../types/handlers"

import { pathToFileURL } from "url"
import { util } from "qingkuai/compiler"
import { getCompileRes, walk } from "../compile"
import { TextEdit } from "vscode-languageserver/node"
import { documents, isTestingEnv, tpic } from "../state"
import { findNodeAt, findTagRanges } from "../util/qingkuai"
import { isEmptyString, isUndefined } from "../../../../shared-util/assert"

export const rename: RenameHandler = async ({ textDocument, position, newName }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return
    }

    const cr = await getCompileRes(document)
    const { getRange, getOffset, templateNodes } = cr

    const offset = getOffset(position)
    if (!isTestingEnv && cr.isPositionFlagSet(offset, "inScript")) {
        const res: RenameResult = await tpic.sendRequest<TPICCommonRequestParams>("rename", {
            fileName: cr.filePath,
            pos: cr.interIndexMap.stoi[offset]
        })

        if (!res.locations.length) {
            return null
        }

        const textEdits = await converRenameLocationItemsToTextEdits(res.locations, newName)

        // 如果修改的是当前文件导入的组件标识符，则修改模板中所有的同名组件标签
        if (res.changedComponentName) {
            walk(cr.templateNodes, node => {
                if (node.componentTag === res.changedComponentName) {
                    const existing =
                        textEdits[textDocument.uri] || (textEdits[textDocument.uri] = [])
                    if (node.endTagStartPos.index !== -1) {
                        existing.push(
                            TextEdit.replace(
                                cr.getRange(
                                    node.endTagStartPos.index + 2,
                                    node.endTagStartPos.index + node.tag.length + 2
                                ),
                                newName
                            )
                        )
                    }
                    existing.push(
                        TextEdit.replace(
                            cr.getRange(node.range[0] + 1, node.range[0] + node.tag.length + 1),
                            newName
                        )
                    )
                }
            })
        }

        return { changes: textEdits }
    }

    const currentNode = findNodeAt(templateNodes, offset)
    if (isUndefined(currentNode) || isEmptyString(currentNode.tag)) {
        return null
    }

    // 重命名HTML标签名
    const textEdits: TextEdit[] = []
    findTagRanges(currentNode, offset, true).forEach(range => {
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
        const posRange = await tpic.sendRequest<TPICCommonRequestParams, NumNum>("prepareRename", {
            fileName: cr.filePath,
            pos: cr.interIndexMap.stoi[offset]
        })
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

    const tagRanges = findTagRanges(currentNode, offset, true)
    if (!isUndefined(tagRanges[0])) {
        return getRange(...tagRanges[offset <= tagRanges[0][1] ? 0 : 1]!)
    }
}

async function converRenameLocationItemsToTextEdits(
    locations: RenameLocationItem[],
    newName: string
) {
    const textEdits: Record<string, TextEdit[]> = {}

    for (const item of locations) {
        const uri = pathToFileURL(item.fileName || "").toString()
        const document = documents.get(uri)
        let [start, end] = item.range

        if (!document) {
            continue
        }

        let newText = newName
        if (item.fileName?.endsWith(".qk")) {
            const cr = await getCompileRes(document, false)
            if (!cr.isPositionFlagSet(start, "inScript")) {
                // 如果重命名目标为组件标识符，则移除
                if (cr.isPositionFlagSet(start, "isComponentStart")) {
                    continue
                }

                // 若修改项目为组件属性修改，则将属性名修改为驼峰格式（若为插值属性需将开始位置+1）
                if (cr.isPositionFlagSet(start, "isAttributeStart")) {
                    if (/[!@&]/.test(document.getText()[start])) {
                        start++
                    }
                    newText = util.camel2Kebab(newText)
                }
            }
        }

        const existing = textEdits[uri] || (textEdits[uri] = [])
        existing.push(
            TextEdit.replace(
                {
                    start: document.positionAt(start),
                    end: document.positionAt(end)
                },
                newText
            )
        )
    }

    return textEdits
}
