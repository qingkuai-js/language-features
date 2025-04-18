import type TS from "typescript"
import type { Range } from "vscode-languageserver-types"

import { getSourceIndex } from "../qingkuai"
import { isIndexesInvalid } from "../../../../../shared-util/qingkuai"
import { isQingkuaiFileName } from "../../../../../shared-util/assert"
import { getLineAndCharacter, getInterIndexByLineAndCharacter, getCompileInfo } from "../state"

// TS.LineAndCharacter
export const lineAndCharacter = {
    toSource(
        fileName: string,
        lineAndCharacter: TS.LineAndCharacter,
        isEnd = false
    ): TS.LineAndCharacter | undefined {
        if (!isQingkuaiFileName(fileName)) {
            return lineAndCharacter
        }

        const interIndex = getInterIndexByLineAndCharacter(fileName, lineAndCharacter)
        const sourceIndex = getSourceIndex(fileName, interIndex, isEnd)
        if (isIndexesInvalid(sourceIndex)) {
            return undefined
        }

        const position = getCompileInfo(fileName).positions[sourceIndex]
        return { line: position.line - 1, character: position.column }
    },

    toProtocolLocation(lineAndCharacter: TS.LineAndCharacter): TS.server.protocol.Location {
        return { line: lineAndCharacter.line + 1, offset: lineAndCharacter.character + 1 }
    }
}

// Range of language-server
export const lsRange = {
    fromProtocolTextSpan(fileName: string, span: TS.server.protocol.TextSpan): Range | undefined {
        const sourceStartPosition = lineAndCharacter.toSource(
            fileName,
            protocolLocation.toLineAndCharacter(span.start)
        )
        const sourceEndPosition = lineAndCharacter.toSource(
            fileName,
            protocolLocation.toLineAndCharacter(span.end)
        )
        if (!sourceStartPosition || !sourceEndPosition) {
            return undefined
        }
        return { start: sourceStartPosition, end: sourceEndPosition }
    },

    fromTextSpan(fileName: string, span: TS.TextSpan): Range | undefined {
        if (!isQingkuaiFileName(fileName)) {
            const startLineAndCharacter = getLineAndCharacter(fileName, span.start)
            const endLineAndCharacter = getLineAndCharacter(fileName, span.start + span.length)
            if (!startLineAndCharacter || !endLineAndCharacter) {
                return undefined
            }
            return { start: startLineAndCharacter, end: endLineAndCharacter }
        }

        const sourceStartIndex = getSourceIndex(fileName, span.start)
        const sourceEndIndex = getSourceIndex(fileName, span.start + span.length, true)
        if (isIndexesInvalid(sourceStartIndex, sourceEndIndex)) {
            return undefined
        }

        const positions = getCompileInfo(fileName).positions
        if (!positions[sourceStartIndex] && !positions[sourceEndIndex]) {
            return undefined
        }

        const endPosition = positions[sourceEndIndex]
        const startPosition = positions[sourceStartIndex]
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

    fromSourceStartAndEnd(fileName: string, sourceStart: number, sourceEnd: number): Range {
        const positions = getCompileInfo(fileName).positions
        return {
            start: {
                line: positions[sourceStart].line - 1,
                character: positions[sourceStart].column
            },
            end: {
                line: positions[sourceEnd].line - 1,
                character: positions[sourceEnd].column
            }
        }
    }
}

// TS.server.protocol.Location
export const protocolLocation = {
    toSource(
        fileName: string,
        location: TS.server.protocol.Location,
        isEnd = false
    ): TS.server.protocol.Location | undefined {
        if (!isQingkuaiFileName(fileName)) {
            return location
        }

        const sourceLineAndCharacter = lineAndCharacter.toSource(
            fileName,
            this.toLineAndCharacter(location),
            isEnd
        )
        return sourceLineAndCharacter && lineAndCharacter.toProtocolLocation(sourceLineAndCharacter)
    },

    toLineAndCharacter(location: TS.server.protocol.Location): TS.LineAndCharacter {
        return {
            line: location.line - 1,
            character: location.offset - 1
        }
    },

    toSourceIndex(fileName: string, location: TS.server.protocol.Location) {
        return getSourceIndex(
            fileName,
            getInterIndexByLineAndCharacter(fileName, this.toLineAndCharacter(location))
        )
    }
}
