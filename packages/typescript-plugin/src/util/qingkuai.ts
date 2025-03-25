import type TS from "typescript"
import type { RealPath } from "../../../../types/common"

import {
    ts,
    Logger,
    snapshotCache,
    projectService,
    typeRefStatement,
    tsFileNameToRealPath,
    resolvedQingkuaiModule
} from "../state"
import { isInTopScope } from "./ast"
import { Messages } from "../message"
import { QingKuaiSnapShot } from "../snapshot"
import { existsSync, readFileSync } from "node:fs"
import { compile, PositionFlag, PositionFlagKeys } from "qingkuai/compiler"
import { debugAssert, isQingkuaiFileName } from "../../../../shared-util/assert"
import { filePathToComponentName, getScriptKindKey } from "../../../../shared-util/qingkuai"

// 通过中间代码索引换取源码索引
export function getSourceIndex(
    snapshot: QingKuaiSnapShot,
    interIndex: number,
    isEnd = false
): number | undefined {
    const sourceIndex = snapshot.itos[interIndex]
    if (sourceIndex !== -1) {
        return sourceIndex
    }
    return isEnd ? snapshot.itos[interIndex + 1] : -1
}

// 通过源码索引验证位置是否设置指定标志
export function isPositionFlagSetBySourceIndex(
    snapshot: QingKuaiSnapShot,
    sourceIndex: number,
    key: PositionFlagKeys
) {
    return !!(snapshot.positions[sourceIndex].flag & PositionFlag[key])
}

// 通过中间代码索引验证位置是否设置指定标志
export function isPositionFlagSetByInterIndex(
    snapshot: QingKuaiSnapShot,
    interIndex: number,
    key: PositionFlagKeys,
    isEnd = false
) {
    const sourceIndex = getSourceIndex(snapshot, interIndex, isEnd)
    if (!sourceIndex || sourceIndex === -1) {
        return false
    }
    return isPositionFlagSetBySourceIndex(snapshot, sourceIndex, key)
}

export function compileQingkuaiFileToInterCode(path: RealPath) {
    debugAssert(existsSync(path))

    try {
        return compile(readFileSync(path, "utf-8")!, {
            check: true,
            typeRefStatement
        })
    } catch (error: any) {
        Logger.error(Messages.UnexpectedCompilerError)
        process.exit(1)
    }
}

export function ensureGetSnapshotOfQingkuaiFile(fileName: RealPath) {
    if (snapshotCache.has(fileName)) {
        return snapshotCache.get(fileName)!
    }

    const compileRes = compileQingkuaiFileToInterCode(fileName)
    const scriptKind = ts.ScriptKind[getScriptKindKey(compileRes)]
    snapshotCache.set(
        fileName,
        new QingKuaiSnapShot(
            compileRes.code,
            true,
            scriptKind,
            compileRes.interIndexMap.itos,
            compileRes.inputDescriptor.slotInfo,
            compileRes.inputDescriptor.positions
        )
    )

    return snapshotCache.get(fileName)!
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
        isInTopScope(identifier) &&
        identifier.getText() === filePathToComponentName(getTsFileName(fileName))
    )
}

export function getTsFileName(realFileName: RealPath) {
    const scriptInfo = projectService.getScriptInfo(realFileName)
    return debugAssert(scriptInfo), scriptInfo!.fileName
}

export function getRealPath(fileName: string) {
    return (tsFileNameToRealPath.get(fileName) || fileName) as RealPath
}

export function recordRealPath(realFileName: string) {
    if (isQingkuaiFileName(realFileName) && !tsFileNameToRealPath.has(realFileName)) {
        const normalizedPath = ts.server.toNormalizedPath(realFileName).toString()
        if (normalizedPath !== realFileName) {
            tsFileNameToRealPath.set(normalizedPath, realFileName as RealPath)
        }
    }
}
