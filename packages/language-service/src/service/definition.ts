import type { CompileResult } from "../../../../types/common"
import type { LocationLink, Range } from "vscode-languageserver-types"
import type { FindScriptDefinitionsFunc, FindScriptTypeDefinitionsFunc } from "../types/service"

import { URI } from "vscode-uri"
import { PositionFlag } from "qingkuai/compiler"
import { excuteCssCommonHandler } from "../util/css"
import { isIndexesInvalid } from "../../../../shared-util/qingkuai"
import { findTemplateAttribute, findTemplateNodeAt, findTagNameRanges } from "../util/qingkuai"

export async function findDefinitions(
    cr: CompileResult,
    offset: number,
    findScriptDefinitions: FindScriptDefinitionsFunc
) {
    if (cr.isPositionFlagSetAtIndex(PositionFlag.InStyle, offset)) {
        const cssRet = excuteCssCommonHandler("findDefinition", cr, offset)
        return cssRet && [cssRet]
    }

    let originSelectionRange: Range | undefined = undefined

    const breakToFindReferencesDirectly = () => {
        if (!originSelectionRange) {
            return null
        }
        return [
            {
                targetUri: cr.document.uri,
                targetRange: originSelectionRange,
                originSelectionRange: originSelectionRange,
                targetSelectionRange: originSelectionRange
            } satisfies LocationLink
        ]
    }

    const surroundingNode = findTemplateNodeAt(cr.templateNodes, offset)
    if (surroundingNode && !cr.isPositionFlagSetAtIndex(PositionFlag.InScript, offset)) {
        const tagNameRanges = findTagNameRanges(surroundingNode, offset)
        const surroundingAttribute = findTemplateAttribute(offset, surroundingNode)

        // 将选择范围确定为标签名称/属性名称的范围
        if (tagNameRanges.start && offset < tagNameRanges.start[1]) {
            originSelectionRange = cr.getVscodeRange(...tagNameRanges.start)
        }
        if (tagNameRanges.end && offset > tagNameRanges.end[0]) {
            originSelectionRange = cr.getVscodeRange(...tagNameRanges.end)
        }
        if (surroundingAttribute) {
            if (surroundingNode.tag === "slot" && surroundingAttribute.name.raw === "name") {
                originSelectionRange = cr.getVscodeRange(surroundingAttribute.loc)
            } else {
                originSelectionRange = cr.getVscodeRange(surroundingAttribute.name.loc)
            }
        }

        // 嵌入脚本标签或没有 name 属性的 slot 标签处直接查找引用
        if (
            (surroundingNode.isEmbedded && /[jt]s$/.test(surroundingNode.tag)) ||
            ("slot" === surroundingNode.tag &&
                !cr.getTemplateNodeContext(surroundingNode).attributesMap.name)
        ) {
            return breakToFindReferencesDirectly()
        }

        // 组件或其未使用 #slot 指令的直接子元素的标签将 offset 调整为开始标签名
        if (
            surroundingNode.componentTag ||
            (surroundingNode.parent?.componentTag &&
                !cr.getTemplateNodeContext(surroundingNode.parent).attributesMap["#slot"])
        ) {
            tagNameRanges.start && (offset = tagNameRanges.start[0])
        }
    }

    const interIndex = cr.getInterIndex(offset)
    if (isIndexesInvalid(interIndex)) {
        return null
    }

    const res = await findScriptDefinitions(cr, interIndex)
    if (!res?.definitions.length) {
        return null
    }
    if (!originSelectionRange) {
        originSelectionRange = res.range
    }
    return res.definitions.map<LocationLink>(item => {
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
    if (!cr.isPositionFlagSetAtIndex(PositionFlag.InScript, offset)) {
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
