import type {
    FindDefinitionParams,
    TPICCommonRequestParams,
    FindDefinitionResultItem
} from "../../../../types/communication"
import type TS from "typescript"

import { server, session, ts } from "../state"
import { TPICHandler } from "../../../../shared-util/constant"
import { convertProtocolTextSpanToRange } from "../util/protocol"
import { convertor, qkContext } from "qingkuai-language-service/adapters"
import { getDefaultSourceFile, getDefaultLanguageService } from "../util/typescript"

export function attachFindDefinition() {
    server.onRequest<FindDefinitionParams>(
        TPICHandler.FindDefinition,
        async ({ fileName, pos, preferGoToSourceDefinition }) => {
            const normalizedPath = ts.server.toNormalizedPath(fileName)
            const sourceFile = getDefaultSourceFile(fileName)
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
            if (!definitionRes.definitions.length) {
                return null
            }

            const originRange = convertor.lsRange.fromProtocolTextSpan(
                fileName,
                definitionRes.textSpan
            )
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

            const dealtDefinitions = definitions.map(
                (item: TS.server.protocol.FileSpanWithContext) => {
                    const realPath = qkContext.getRealPath(item.file)
                    const range = convertProtocolTextSpanToRange(item)
                    if (item.contextStart && item.contextEnd) {
                        const contextRange = convertProtocolTextSpanToRange({
                            start: item.contextStart,
                            end: item.contextEnd
                        })
                        return {
                            fileName: realPath,
                            targetSelectionRange: range,
                            targetRange: contextRange ?? range
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
        params => {
            const languageService = getDefaultLanguageService(params.fileName)
            if (!languageService) {
                return null
            }
            return convertor.getAndConvertTypeDefinitions(languageService, params)
        }
    )
}
