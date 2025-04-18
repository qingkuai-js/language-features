import type TS from "typescript"
import type { RealPath } from "../../../../types/common"
import type { PositionFlagKeys } from "qingkuai/compiler"

import { isInTopScope } from "./ts-ast"
import { PositionFlag } from "qingkuai/compiler"
import { isQingkuaiFileName } from "../../../../shared-util/assert"
import { filePathToComponentName, isIndexesInvalid } from "../../../../shared-util/qingkuai"
import { getCompileInfo, path, resolvedQingkuaiModule, ts, tsFileNameToRealPath } from "./state"

export function getRealPath(fileName: string) {
    return (tsFileNameToRealPath.get(fileName) || fileName) as RealPath
}

// 通过源码索引验证位置是否设置指定标志
export function isPositionFlagSetBySourceIndex(
    fileName: string,
    sourceIndex: number,
    key: PositionFlagKeys
) {
    return !!(getCompileInfo(fileName).positions[sourceIndex].flag & PositionFlag[key])
}

// 通过中间代码索引验证位置是否设置指定标志
export function isPositionFlagSetByInterIndex(
    fileName: string,
    interIndex: number,
    key: PositionFlagKeys,
    isEnd = false
) {
    const sourceIndex = getSourceIndex(fileName, interIndex, isEnd)
    return (
        !isIndexesInvalid(sourceIndex) && isPositionFlagSetBySourceIndex(fileName, sourceIndex, key)
    )
}

// 判断标识符节点是否是导入的组件名称标识符
export function isComponentIdentifier(
    fileName: RealPath,
    identifier: TS.Identifier,
    typeChecker: TS.TypeChecker
) {
    const symbol = typeChecker.getSymbolAtLocation(identifier)
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
        for (const declaration of symbol.declarations || []) {
            if (
                ts.isImportClause(declaration) &&
                ts.isImportDeclaration(declaration.parent) &&
                ts.isStringLiteral(declaration.parent.moduleSpecifier)
            ) {
                const resolvedModules = resolvedQingkuaiModule.get(fileName)
                return !!resolvedModules?.has(declaration.parent.moduleSpecifier.text)
            }
        }
    }
    return (
        isInTopScope(identifier) && identifier.getText() === filePathToComponentName(path, fileName)
    )
}

export function recordRealPath(realFileName: string) {
    if (isQingkuaiFileName(realFileName) && !tsFileNameToRealPath.has(realFileName)) {
        const normalizedPath = ts.server.toNormalizedPath(realFileName).toString()
        if (normalizedPath !== realFileName) {
            tsFileNameToRealPath.set(normalizedPath, realFileName as RealPath)
        }
    }
}

export function getSourceIndex(fileName: string, interIndex: number, isEnd = false) {
    if (!isQingkuaiFileName(fileName)) {
        return interIndex
    }

    const { itos } = getCompileInfo(fileName)
    const sourceIndex = itos[interIndex]
    if (!isEnd || !isIndexesInvalid(sourceIndex)) {
        return sourceIndex ?? -1
    }

    const preSourceIndex = itos[interIndex - 1]
    return isIndexesInvalid(sourceIndex) ? -1 : preSourceIndex + 1
}
