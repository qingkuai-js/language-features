import type { PrepareRename, RenameHander } from "../types/handlers"

import { getCompileRes } from "../compile"
import { TextEdit } from "vscode-languageserver/node"
import { findNodeAt, findTagRanges } from "../util/qingkuai"
import { isEmptyString, isUndefined } from "../../../../shared-util/assert"

export const rename: RenameHander = async ({ textDocument, position, newName }) => {
    const cr = await getCompileRes(textDocument)
    const { getRange, getOffset, templateNodes } = cr

    const offset = getOffset(position)
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

export const prepareRename: PrepareRename = async ({ textDocument, position }) => {
    const cr = await getCompileRes(textDocument)
    const { getRange, getOffset, templateNodes } = cr

    const offset = getOffset(position)
    const currentNode = findNodeAt(templateNodes, offset)
    if (isUndefined(currentNode) || isEmptyString(currentNode)) {
        return null
    }

    const tagRanges = findTagRanges(currentNode, offset, true)
    if (!isUndefined(tagRanges[0])) {
        return getRange(...tagRanges[offset <= tagRanges[0][1] ? 0 : 1]!)
    }
}
