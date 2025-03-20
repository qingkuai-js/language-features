import type TS from "typescript"
import { QingKuaiSnapShot } from "../snapshot"

import {
    ts,
    snapshotCache,
    projectService,
    typeRefStatement,
    openQingkuaiFiles,
    resolvedQingkuaiModule
} from "../state"
import { existsSync, readFileSync } from "node:fs"
import { debugAssert } from "../../../../shared-util/assert"
import { getScriptKindKey } from "../../../../shared-util/qingkuai"
import { compile, PositionFlag, PositionFlagKeys } from "qingkuai/compiler"

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

export function reopenQingkuaiFile(fileName: string) {
    openQingkuaiFiles.delete(fileName)
    projectService.closeClientFile(fileName)
    projectService.openClientFile(fileName)
    openQingkuaiFiles.add(fileName)
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

export function compileQingkuaiFileToInterCode(fileName: string) {
    debugAssert(existsSync(fileName))

    return compile(readFileSync(fileName, "utf-8")!, {
        check: true,
        typeRefStatement
    })
}

export function ensureGetSnapshotOfQingkuaiFile(fileName: string) {
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
    fileName: string,
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
                if (resolvedModules?.has(declaration.parent.moduleSpecifier.text)) {
                    return true
                }
            }
        }
    }
    return false
}
