import type TS from "typescript"
import type { NumNum } from "../../../../types/common"
import type { Range } from "vscode-languageserver/node"
import type { FindDefinitionParams } from "../../../../types/communication"

import { server, session, ts } from "../state"
import { isQingkuaiFileName } from "../util/qingkuai"
import { getDefaultSourceFileByFileName } from "../util/typescript"

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

            const dealtDefinitions = definitions.map((item: any) => {
                const range = getRnageByFileName(item.file, item.start, item.end)
                if (item.contextStart && item.contextEnd) {
                    return {
                        fileName: item.file,
                        targetRange: getRnageByFileName(
                            item.file,
                            item.contextStart,
                            item.contextEnd
                        ),
                        targetSelectionRange: range
                    }
                }
                return {
                    fileName: item.file,
                    targetRange: range
                }
            })

            return { range: originRange, definitions: dealtDefinitions }
        }
    )
}

export function getRnageByFileName(
    fileName: string,
    start: TS.server.protocol.Location,
    end: TS.server.protocol.Location
): NumNum | Range {
    if (!isQingkuaiFileName(fileName)) {
        return {
            start: {
                line: start.line - 1,
                character: start.offset - 1
            },
            end: {
                line: end.line - 1,
                character: end.offset - 1
            }
        }
    }

    const sourceFile = getDefaultSourceFileByFileName(fileName)!
    return [
        sourceFile.getPositionOfLineAndCharacter(start.line - 1, start.offset - 1),
        sourceFile.getPositionOfLineAndCharacter(end.line - 1, end.offset - 1)
    ]
}
