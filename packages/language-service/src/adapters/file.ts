import type TS from "typescript"
import type { FileEdit } from "./convert/content"
import type { LSMessage } from "../types/service"
import type { TypescriptAdapter } from "./adapter"
import type { Getter } from "../../../../types/util"
import type { LSDiagnostic } from "../types/adapter"
import type { ASTPositionWithFlag } from "qingkuai/compiler"
import type { ComponentAttributeItem, TsNormalizedPath } from "../../../../types/common"
import type { UpdateContentParams, UpdateContentResult } from "../../../../types/communication"

import {
    recoverPositions,
    recoverNumberArray,
    compressNumberArray
} from "../../../../shared-util/qingkuai"
import { INITIAL_VERSION } from "../constants"
import { PositionFlag } from "qingkuai/compiler"
import { ignoredComponentNameChars } from "../regular"
import { util as qingkuaiUtils } from "qingkuai/compiler"
import { getIdentifierDescriptionsMap } from "../util/qingkuai"

export class QingkuaiFileInfo {
    public isOpen = false
    public typesConfirmed = false
    public slotNames: string[] = []
    public qingkuaiPackagePath = ""
    public defaultExportTypeStr = ""
    public lsDiagnostics: LSDiagnostic[] = []
    public attributes: ComponentAttributeItem[] = []

    private nextAdjustSourceIndex = -1

    constructor(
        public code: string,
        public isTS: boolean,
        public version: number,
        public componentName: string,
        public path: TsNormalizedPath,
        public getTypeDelayIndexes: number[],
        public idDescriptions: Record<string, string>,
        private ts: typeof TS,
        private itos: number[],
        private stoi: number[],
        private positions: ASTPositionWithFlag[],
        private getSourceFile: Getter<TS.SourceFile>
    ) {}

    get compressedIndexMap() {
        return {
            aitos: compressNumberArray(this.itos),
            astoi: compressNumberArray(this.stoi)
        }
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

    isPositionFlagSetAtIndex(key: keyof typeof PositionFlag, index: number) {
        return !!(this.positions[index].flag & PositionFlag[key])
    }

    adjustIndexMap(edit: FileEdit) {
        const newItos: number[] = []
        const editStartIndex = edit.editStartIndex
        const prefixEnd = Math.min(editStartIndex, this.itos.length)
        for (let i = 0; i < prefixEnd; i++) {
            newItos.push(this.itos[i])
        }

        for (let i = 0, j = editStartIndex; i < edit.items.length; i++) {
            const item = edit.items[i]
            const contentLength = item.content.length
            const [interStart, interEnd] = [j, (j += contentLength)]
            for (let i = 0; i < this.stoi.length; i++) {
                if (this.stoi[i] > interStart) {
                    this.stoi[i] += contentLength
                }
            }
            if (!item.sourceRange) {
                for (let k = 0; k < contentLength; k++) {
                    newItos.push(-1)
                }

                if (this.nextAdjustSourceIndex !== -1) {
                    newItos[interStart] = this.nextAdjustSourceIndex
                    this.stoi[this.nextAdjustSourceIndex] = interStart
                    this.nextAdjustSourceIndex = -1
                }
                continue
            }

            const [sourceStart, sourceEnd] = item.sourceRange
            this.stoi[sourceEnd] = interEnd
            this.nextAdjustSourceIndex = sourceEnd

            for (let i = 0; i < contentLength; i++) {
                newItos.push(Math.min(sourceStart + i, sourceEnd - 1))
            }
            for (let i = 0; i < Math.min(contentLength, sourceEnd - sourceStart); i++) {
                this.stoi[sourceStart + i] = Math.min(interStart + i, interEnd - 1)
            }
        }
        for (let i = editStartIndex; i < this.itos.length; i++) {
            newItos.push(this.itos[i])
        }
        this.itos = newItos
    }

    pushDiagnostic(start: number, end: number, value: LSMessage, isSourceLoc?: boolean) {
        const [code, message, link] = value
        const category =
            code >= 3000 && code < 4000
                ? this.ts.DiagnosticCategory.Error
                : this.ts.DiagnosticCategory.Warning
        this.lsDiagnostics.push({
            code,
            category,
            isSourceLoc,
            url: link,
            start: start,
            source: "qk",
            length: end - start,
            messageText: message,
            file: this.getSourceFile()
        })
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
        existing?.version ?? INITIAL_VERSION,
        filePathToComponentName(adapter, path),
        path,
        params.getTypeDelayIndexes,
        params.identifierDescriptions,
        adapter.ts,
        itos,
        stoi,
        positions,
        () => adapter.getDefaultSourceFile(path)!
    )
    newFileInfo.isOpen = !!existing?.isOpen
    adapter.updateContent(newFileInfo, params.content)
    adapter.qingkuaiFileInfos.set(path, newFileInfo)
    adapter.service.confirmTypes(newFileInfo)
    return newFileInfo.compressedIndexMap
}

export function ensureGetQingkuaiFileInfo(adapter: TypescriptAdapter, path: TsNormalizedPath) {
    const existing = adapter.qingkuaiFileInfos.get(path)
    if (existing) {
        return existing
    }

    const newFileInfo = compileQingkuaiFile(adapter, path)
    return (adapter.service.confirmTypes(newFileInfo), newFileInfo)
}

function filePathToComponentName(adapter: TypescriptAdapter, filePath: string) {
    const ext = adapter.path.ext(filePath)
    const base = adapter.path
        .base(filePath)
        .slice(0, -ext.length)
        .replace(ignoredComponentNameChars, "")
    if (!base) {
        return "Anonymous"
    }
    return qingkuaiUtils.kebab2Camel(base, true)
}

function compileQingkuaiFile(adapter: TypescriptAdapter, path: TsNormalizedPath) {
    const compileRes = adapter.compile(path)
    const existing = adapter.qingkuaiFileInfos.get(path)
    const newVersion = existing ? existing.version + 1 : INITIAL_VERSION
    const fileInfo = new QingkuaiFileInfo(
        compileRes.code,
        compileRes.scriptDescriptor.isTS,
        newVersion,
        filePathToComponentName(adapter, path),
        path,
        compileRes.getTypeDelayInterIndexes,
        getIdentifierDescriptionsMap(compileRes),
        adapter.ts,
        compileRes.indexMap.itos,
        compileRes.indexMap.stoi,
        compileRes.positions,
        () => adapter.getDefaultSourceFile(path)!
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
