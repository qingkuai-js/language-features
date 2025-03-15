import type {
    FindDefinitionParams,
    TPICCommonRequestParams,
    FindDefinitionResultItem
} from "../../../../types/communication"
import type TS from "typescript"
import type { NumNum } from "../../../../types/common"
import type { Range } from "vscode-languageserver/node"

import {
    getDefaultSourceFileByFileName,
    getDefaultLanguageServiceByFileName
} from "../util/typescript"
import { server, session, ts } from "../state"
import { convertTextSpanToRange } from "../util/service"
import { DEFAULT_RANGE } from "../../../../shared-util/constant"
import { convertProtocolTextSpanToRange } from "../util/protocol"

export function attachFindDefinition() {
    server.onRequest<FindDefinitionParams>(
        "findDefinition",
        async ({ fileName, pos, preferGoToSourceDefinition }) => {
            const sourceFile = getDefaultSourceFileByFileName(fileName)
            if (!session || !sourceFile) {
                return null
            }

            // @ts-expect-error: access private methods
            const { getDefinitionAndBoundSpan, findSourceDefinition } = session
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos)

            const arg = {
                file: fileName,
                line: line + 1,
                offset: character + 1
            }
            const definitionRes = getDefinitionAndBoundSpan.call(session, arg, true)
            if (!definitionRes || !definitionRes.definitions.length) {
                return null
            }

            let definitions = definitionRes.definitions
            if (preferGoToSourceDefinition && ts.version >= "4.7.0") {
                const sourceDefinitions = findSourceDefinition.call(session, arg)
                if (sourceDefinitions.length) {
                    definitions = sourceDefinitions
                }
            }

            const originRange: NumNum = [
                sourceFile.getPositionOfLineAndCharacter(
                    definitionRes.textSpan.start.line - 1,
                    definitionRes.textSpan.start.offset - 1
                ),
                sourceFile.getPositionOfLineAndCharacter(
                    definitionRes.textSpan.end.line - 1,
                    definitionRes.textSpan.end.offset - 1
                )
            ]

            const dealtDefinitions = definitions.map(
                (item: TS.server.protocol.FileSpanWithContext) => {
                    const range = convertProtocolTextSpanToRange(item)
                    if (item.contextStart && item.contextEnd) {
                        const contextRange = convertProtocolTextSpanToRange({
                            start: item.contextStart,
                            end: item.contextEnd
                        })
                        return {
                            fileName: item.file,
                            targetRange: contextRange,
                            targetSelectionRange: range
                        }
                    }
                    return {
                        fileName: item.file,
                        targetRange: range,
                        targetSelectionRange: range
                    }
                }
            )

            return { range: originRange, definitions: dealtDefinitions }
        }
    )

    server.onRequest<TPICCommonRequestParams, FindDefinitionResultItem[] | null>(
        "findTypeDefinition",
        ({ fileName, pos }) => {
            const languageService = getDefaultLanguageServiceByFileName(fileName)
            const definitions = languageService?.getTypeDefinitionAtPosition(fileName, pos)
            if (!definitions?.length) {
                return null
            }

            return definitions.map(definition => {
                const range =
                    convertTextSpanToRange(definition.fileName, definition.textSpan) ||
                    DEFAULT_RANGE

                let contextRange: Range | undefined = undefined
                if (definition.contextSpan) {
                    contextRange = convertTextSpanToRange(
                        definition.fileName,
                        definition.contextSpan
                    )
                }

                return {
                    fileName: definition.fileName,
                    targetRange: range,
                    targetSelectionRange: contextRange || range
                }
            })
        }
    )
}
