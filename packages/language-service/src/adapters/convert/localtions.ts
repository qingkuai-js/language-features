import type TS from "typescript"

import type { TypescriptAdapter } from "../adapter"
import type { Range as LsRange } from "vscode-languageserver-types"

import { SOURCE_SPAN_MARK } from "../../constants"
import { TsNormalizedPath } from "../../../../../types/common"
import { isIndexesInvalid } from "../../../../../shared-util/qingkuai"
import { isQingkuaiFileName } from "../../../../../shared-util/assert"

export class LocationConvertor {
    private sourceFile: TS.SourceFile
    private adapter: TypescriptAdapter
    private filePath: TsNormalizedPath

    constructor(adapter: TypescriptAdapter, fileName: string) {
        this.adapter = adapter
        this.filePath = adapter.getNormalizedPath(fileName)
        this.sourceFile = adapter.getDefaultSourceFile(this.filePath)!
    }

    public lineAndCharacter = {
        fromInterIndex: (interIndex: number) => {
            if (!this.sourceFile) {
                return this.lineAndCharacter.defaultValue
            }
            return this.sourceFile.getLineAndCharacterOfPosition(interIndex)
        },

        toInterIndex: (lineAndCharacter: TS.LineAndCharacter) => {
            if (!this.sourceFile) {
                return -1
            }
            return this.sourceFile.getPositionOfLineAndCharacter(
                lineAndCharacter.line,
                lineAndCharacter.character
            )
        },

        toSourceLineAndCharacter: (lineAndCharacter: TS.LineAndCharacter) => {
            if (!this.sourceFile) {
                return this.lineAndCharacter.defaultValue
            }

            if (!isQingkuaiFileName(this.filePath)) {
                return lineAndCharacter
            }

            const fileInfo = this.adapter.service.ensureGetQingkuaiFileInfo(this.filePath)
            const interIndex = this.lineAndCharacter.toInterIndex(lineAndCharacter)
            const sourceIndex = fileInfo.getSourceIndex(interIndex)
            if (isIndexesInvalid(sourceIndex)) {
                return undefined
            }
            // 越界判定统一在 getPositionByIndex 内完成（见 ../file.ts），这里只处理
            // "没有位置"的情况，不再由各个调用点各自解引用
            const position = fileInfo.getPositionByIndex(sourceIndex)
            if (!position) {
                return undefined
            }
            return {
                line: position.line - 1,
                character: position.column
            }
        },

        defaultValue: { line: 0, character: 0 } satisfies TS.LineAndCharacter
    }

    public textSpan = {
        toSourceTextSpan: (span: TS.TextSpan): TS.TextSpan => {
            if (!isQingkuaiFileName(this.filePath)) {
                return span
            }

            const fileInfo = this.adapter.service.ensureGetQingkuaiFileInfo(this.filePath)
            const sourceStart = fileInfo.getSourceIndex(span.start)
            const sourceEnd = fileInfo.getSourceIndex(span.start + span.length)
            if (isIndexesInvalid(sourceStart, sourceEnd)) {
                return this.textSpan.defaultValue
            }
            return {
                start: sourceStart,
                length: sourceEnd - sourceStart,
                [SOURCE_SPAN_MARK]: true
            } as any
        },

        defaultValue: { start: 0, length: 0 } satisfies TS.TextSpan
    }

    public languageServerRange = {
        fromTextSpan: (span: TS.TextSpan): LsRange => {
            if (!isQingkuaiFileName(this.filePath)) {
                return this.languageServerRange.fromSourceStartAndEnd(
                    span.start,
                    span.start + span.length
                )
            }

            const fileInfo = this.adapter.service.ensureGetQingkuaiFileInfo(this.filePath)
            const sourceStartIndex = fileInfo.getSourceIndex(span.start)
            const sourceEndIndex = fileInfo.getSourceIndex(span.start + span.length)
            if (isIndexesInvalid(sourceStartIndex, sourceEndIndex)) {
                return this.languageServerRange.defaultValue
            }
            return this.languageServerRange.fromSourceStartAndEnd(sourceStartIndex, sourceEndIndex)
        },

        fromSourceTextSpan: (span: TS.TextSpan): LsRange => {
            return this.languageServerRange.fromSourceStartAndEnd(
                span.start,
                span.start + span.length
            )
        },

        fromSourceStartAndEnd: (sourceStart: number, sourceEnd: number): LsRange => {
            if (!this.sourceFile) {
                return this.languageServerRange.defaultValue
            }

            if (!isQingkuaiFileName(this.filePath)) {
                return {
                    start: this.sourceFile.getLineAndCharacterOfPosition(sourceStart),
                    end: this.sourceFile.getLineAndCharacterOfPosition(sourceEnd)
                }
            }

            const fileInfo = this.adapter.service.ensureGetQingkuaiFileInfo(this.filePath)
            // 越界由 getPositionByIndex 统一判定（见 ../file.ts），取不到就退回默认范围
            const startPosition = fileInfo.getPositionByIndex(sourceStart)
            const endPosition = fileInfo.getPositionByIndex(sourceEnd)
            if (!startPosition || !endPosition) {
                return this.languageServerRange.defaultValue
            }
            return {
                start: {
                    line: startPosition.line - 1,
                    character: startPosition.column
                },
                end: {
                    line: endPosition.line - 1,
                    character: endPosition.column
                }
            }
        },

        defaultValue: {
            start: this.lineAndCharacter.defaultValue,
            end: this.lineAndCharacter.defaultValue
        } satisfies LsRange
    }
}
