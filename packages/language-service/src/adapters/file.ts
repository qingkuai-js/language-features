import type { TypescriptAdapter } from "./adapter"
import type { ASTPositionWithFlag } from "qingkuai/compiler"
import type { ComponentAttributeItem, Pair, TsNormalizedPath } from "../../../../types/common"
import type { UpdateContentParams, UpdateContentResult } from "../../../../types/communication"

import {
    recoverPositions,
    recoverNumberArray,
    compressNumberArray
} from "../../../../shared-util/qingkuai"
import { PositionFlag } from "qingkuai/compiler"
import { compileIntermediate } from "qingkuai/compiler"
import { util as qingkuaiUtils } from "qingkuai/compiler"
import { confirmTypesForCompileResult } from "./convert/content"

export class QingkuaiFileInfo {
    private nextAdjustSourceIndex = -1

    public isOpen = false
    public componentName: string
    public typesConfirmed = false
    public slotNames: string[] = []
    public defaultExportTypeStr = ""
    public attributes: ComponentAttributeItem[] = []

    constructor(
        public code: string,
        public isTS: boolean,
        public version: number,
        public path: TsNormalizedPath,
        public getTypeDelayIndexes: number[],
        public idStatusInfo: Record<string, string>,
        public exportValueSourceRange: Pair<number> | undefined,
        private adapter: TypescriptAdapter,
        private itos: number[],
        private stoi: number[],
        private positions: ASTPositionWithFlag[]
    ) {
        this.componentName = filePathToComponentName(adapter, path)
    }

    getSourceIndex(interIndex: number) {
        return this.itos[interIndex]
    }

    getInterIndex(sourceIndex: number) {
        return this.stoi[sourceIndex]
    }

    getPositionByIndex(index: number) {
        return this.positions[index]
    }

    updateContent(newContent: string) {
        this.adapter.updateContent(this, newContent)
    }

    confirmTypes() {
        confirmTypesForCompileResult(this.adapter, this)
    }

    isPositionFlagSetAtIndex(key: keyof typeof PositionFlag, index: number) {
        return !!(this.positions[index].flag & PositionFlag[key])
    }

    adjustIndexMap(interRange: Pair<number>, sourceRange?: Pair<number>) {
        const [interStart, interEnd] = interRange
        if (!sourceRange) {
            this.itos.push(...Array(interEnd - interStart).fill(-1))

            if (this.nextAdjustSourceIndex !== -1) {
                this.itos[interStart] = this.nextAdjustSourceIndex
                this.nextAdjustSourceIndex = -1
            }
        } else {
            const [sourceStart, sourceEnd] = sourceRange
            this.stoi[sourceEnd] = interEnd
            this.nextAdjustSourceIndex = sourceEnd

            for (let i = 0; i < interEnd - interStart; i++) {
                this.itos.push(Math.min(sourceStart + i, sourceEnd - 1))
            }
            for (let i = 0; i < sourceEnd - sourceStart; i++) {
                this.stoi[sourceStart + i] = Math.min(interStart + i, interEnd - 1)
            }
        }
    }
}

export function updateQingkuaiFile(
    adapter: TypescriptAdapter,
    params: UpdateContentParams
): UpdateContentResult {
    const itos = recoverNumberArray(params.itos)
    const stoi = recoverNumberArray(params.stoi)
    const path = adapter.getNormalizedPath(params.fileName)
    const existing = adapter.qingkuaiFileInfos.get(path)
    const positions = recoverPositions(params.positions)
    const flags = recoverNumberArray(params.positionFlags)
    for (let i = 0; i < positions.length; i++) {
        positions[i].flag = flags[i]
    }
    const newFileInfo = new QingkuaiFileInfo(
        params.content,
        params.isTS,
        existing?.version ?? 0,
        path,
        params.getTypeDelayIndexes,
        params.identifierStatusInfo,
        params.exportValueSourceRange,
        adapter,
        itos,
        stoi,
        positions
    )
    newFileInfo.isOpen = !!existing?.isOpen
    newFileInfo.updateContent(params.content)
    adapter.qingkuaiFileInfos.set(path, newFileInfo)
    newFileInfo.confirmTypes()
    return {
        aitos: compressNumberArray(itos),
        astoi: compressNumberArray(stoi)
    }
}

export function ensureGetQingkuaiFileInfo(adapter: TypescriptAdapter, path: TsNormalizedPath) {
    const existing = adapter.qingkuaiFileInfos.get(path)
    if (existing) {
        return existing
    }

    const newFileInfo = compileQingkuaiFile(adapter, path)
    return (newFileInfo.confirmTypes(), newFileInfo)
}

function filePathToComponentName(adapter: TypescriptAdapter, filePath: string) {
    let base = adapter.path.base(filePath)
    base = base.replace(/[^a-zA-Z]*/, "")
    base = base.replace(/[^a-zA-Z\d]/g, "")
    if (!base) {
        return "Anonymous"
    }
    return qingkuaiUtils.kebab2Camel(base, true)
}

function compileQingkuaiFile(adapter: TypescriptAdapter, path: TsNormalizedPath) {
    const existing = adapter.qingkuaiFileInfos.get(path)
    const newVersion = existing ? existing.version + 1 : 0
    const compileRes = compileIntermediate(adapter.fs.read(path), {
        typeDeclarationFilePath: adapter.typeDeclarationFilePath
    })
    const fileInfo = new QingkuaiFileInfo(
        compileRes.code,
        compileRes.scriptDescriptor.isTS,
        newVersion,
        path,
        compileRes.getTypeDelayInterIndexes,
        compileRes.identifierStatusInfo,
        undefined,
        adapter,
        compileRes.indexMap.itos,
        compileRes.indexMap.stoi,
        compileRes.positions
    )
    return (adapter.qingkuaiFileInfos.set(path, fileInfo), fileInfo)
}

// function diff(oldContent: string, newContent: string): DiffResult {
//     const oldLength = oldContent.length
//     const newLength = newContent.length

//     let diffStartIndex = 0
//     let oldEndIndex = oldLength - 1
//     let newEndIndex = newLength - 1

//     // 新旧内容无变化，返回无变化表示
//     // If contents are identical, return no change
//     if (oldContent === newContent) {
//         return {
//             start: 0,
//             end: 0,
//             content: ""
//         }
//     }

//     // 新旧内容其中之一是空文本
//     // one of the old and new contents is the empty text
//     if (oldLength === 0) {
//         return {
//             start: 0,
//             end: 0,
//             content: newContent
//         }
//     }
//     if (newLength === 0) {
//         return {
//             start: 0,
//             end: oldLength,
//             content: ""
//         }
//     }

//     // 从前向后找到首个不同字符的索引
//     // find the index of first different character from front to back
//     while (
//         diffStartIndex < oldLength &&
//         diffStartIndex < newLength &&
//         oldContent[diffStartIndex] === newContent[diffStartIndex]
//     ) {
//         diffStartIndex++
//     }

//     // 从后向前找到首个不同字符的索引
//     // find the index of first different character from back to front
//     while (
//         diffStartIndex <= oldEndIndex &&
//         diffStartIndex <= newEndIndex &&
//         oldContent[oldEndIndex] === newContent[newEndIndex]
//     ) {
//         oldEndIndex--
//         newEndIndex--
//     }

//     return {
//         start: diffStartIndex,
//         end: oldEndIndex + 1,
//         content: newContent.slice(diffStartIndex, oldEndIndex + 1)
//     }
// }
