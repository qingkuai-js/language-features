import type TS from "typescript"

import {
    ts,
    snapshotCache,
    projectService,
    typeRefStatement,
    resolvedQingkuaiModule
} from "../state"
import fs from "fs"
import assert from "assert"
import { compile } from "qingkuai/compiler"
import { QingKuaiSnapShot } from "../snapshot"
import { getScriptKindKey } from "../../../../shared-util/qingkuai"
import { updateQingkuaiSnapshot } from "../server/content/snapshot"

export function isQingkuaiFileName(fileName: string) {
    return fileName.endsWith(".qk")
}

export function compileQingkuaiFileToInterCode(fileName: string) {
    assert(fs.existsSync(fileName))

    return compile(fs.readFileSync(fileName, "utf-8")!, {
        check: true,
        typeRefStatement
    })
}

// 通过中间代码索引换取指定文件的源码索引
export function getSourceIndex(fileName: string, interIndex: number, isEnd = false) {
    if (!isQingkuaiFileName(fileName)) {
        return -1
    }
    const itos = ensureGetSnapshotOfQingkuaiFile(fileName).itos
    if (itos[interIndex] !== -1) {
        return itos[interIndex]
    }
    return isEnd ? itos[interIndex + 1] || -1 : itos[interIndex] || -1
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

export function ensureGetSnapshotOfQingkuaiFile(fileName: string) {
    if (snapshotCache.has(fileName)) {
        return initialEditScriptInfo(fileName), snapshotCache.get(fileName)!
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
            compileRes.inputDescriptor.slotInfo
        )
    )

    return initialEditScriptInfo(fileName), snapshotCache.get(fileName)!
}

function initialEditScriptInfo(fileName: string) {
    const qingkuaiSnapshot = snapshotCache.get(fileName)!
    const scriptInfo = projectService.getScriptInfo(fileName)

    if (qingkuaiSnapshot.initial && scriptInfo) {
        qingkuaiSnapshot.initial = false

        const oldLength = scriptInfo.getSnapshot().getLength()
        const qingkuaiSnapshotContent = qingkuaiSnapshot.getFullText()
        scriptInfo.editContent(0, oldLength, qingkuaiSnapshotContent)
        updateQingkuaiSnapshot(
            fileName,
            qingkuaiSnapshotContent,
            qingkuaiSnapshot.itos,
            qingkuaiSnapshot.slotInfo,
            qingkuaiSnapshot.scriptKind
        )
    }
}
