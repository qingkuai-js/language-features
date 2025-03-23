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
import { getRealPath } from "../util/qingkuai"
import { server, session, ts } from "../state"
import { convertTextSpanToRange } from "../util/service"
import { convertProtocolTextSpanToRange } from "../util/protocol"
import { DEFAULT_RANGE, TPICHandler } from "../../../../shared-util/constant"

export function attachFindDefinition() {
    server.onRequest<FindDefinitionParams>(
        TPICHandler.FindDefinition,
        async ({ fileName, pos, preferGoToSourceDefinition }) => {
            const normalizedPath = ts.server.toNormalizedPath(fileName)
            const sourceFile = getDefaultSourceFileByFileName(fileName)
            if (!session || !sourceFile) {
                return null
            }

            // @ts-expect-error: access private methods
            const { getDefinitionAndBoundSpan, findSourceDefinition } = session
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos)

            const arg = {
                file: normalizedPath,
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
                    const realPath = getRealPath(item.file)
                    const range = convertProtocolTextSpanToRange(item)
                    if (item.contextStart && item.contextEnd) {
                        const contextRange = convertProtocolTextSpanToRange({
                            start: item.contextStart,
                            end: item.contextEnd
                        })
                        return {
                            fileName: realPath,
                            targetRange: contextRange,
                            targetSelectionRange: range
                        }
                    }
                    return {
                        fileName: realPath,
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
                const realPath = getRealPath(definition.fileName)
                const range = convertTextSpanToRange(realPath, definition.textSpan) || DEFAULT_RANGE

                let contextRange: Range | undefined = undefined
                if (definition.contextSpan) {
                    contextRange = convertTextSpanToRange(realPath, definition.contextSpan)
                }

                return {
                    fileName: realPath,
                    targetRange: range,
                    targetSelectionRange: contextRange || range
                }
            })
        }
    )
}
