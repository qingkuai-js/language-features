import type {
    FindReferenceResultItem,
    TPICCommonRequestParams,
    FindComponentTagRangeParams
} from "../../../../types/communication"
import type TS from "typescript"
import type { Range } from "vscode-languageserver"

import { server, session, ts } from "../state"
import { findNodeAtPosition } from "../util/ast"
import { TPICHandler } from "../../../../shared-util/constant"
import { convertProtocolTextSpanToRange } from "../util/protocol"
import { isQingkuaiFileName } from "../../../../shared-util/assert"
import { filePathToComponentName } from "../../../../shared-util/qingkuai"
import { getDefaultSourceFileByFileName, getFileReferences } from "../util/typescript"

export function attachFindReference() {
    server.onRequest<TPICCommonRequestParams>(
        TPICHandler.FindReference,
        async ({ fileName, pos }) => {
            const result: FindReferenceResultItem[] = []
            const sourceFile = getDefaultSourceFileByFileName(fileName)!
            const node = findNodeAtPosition(sourceFile, pos)
            if (
                node?.parent &&
                ["Refs", "Props"].includes(node.getText()) &&
                (ts.isTypeAliasDeclaration(node.parent) || ts.isInterfaceDeclaration(node.parent))
            ) {
                for (const refFileName of getFileReferences(fileName)) {
                    if (!isQingkuaiFileName(fileName)) {
                        continue
                    }

                    const ranges: Range[] = await server.sendRequest<FindComponentTagRangeParams>(
                        TPICHandler.FindComponentTagRange,
                        {
                            fileName: refFileName,
                            componentTag: filePathToComponentName(fileName)
                        }
                    )
                    ranges.forEach(range => result.push({ range, fileName: refFileName }))
                }
            }

            // @ts-expect-error: access private method
            const getReferences = session.getReferences.bind(session)
            const lineAndCharacter = sourceFile.getLineAndCharacterOfPosition(pos)
            const res = getReferences(
                {
                    file: fileName,
                    line: lineAndCharacter.line + 1,
                    offset: lineAndCharacter.character + 1
                },
                true
            )

            if (!res.refs.length) {
                return null
            }

            res.refs = res.refs.filter((item: any) => {
                return !item.isDefinition
            })
            res.refs.forEach((item: TS.server.protocol.FileSpan) => {
                result.push({
                    fileName: item.file,
                    range: convertProtocolTextSpanToRange(item)
                })
            })
            return result
        }
    )
}
