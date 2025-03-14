import type TS from "typescript"
import type { TPICCommonRequestParams } from "../../../../types/communication"

import { server, session } from "../state"
import { convertProtocolTextSpanToRange } from "../util/protocol"
import { getDefaultSourceFileByFileName } from "../util/typescript"

export function attachFindReference() {
    server.onRequest<TPICCommonRequestParams>("findReference", ({ fileName, pos }) => {
        // @ts-expect-error: access private method
        const getReferences = session.getReferences.bind(session)
        const sourceFile = getDefaultSourceFileByFileName(fileName)!
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

        return res.refs.map((item: TS.server.protocol.FileSpan) => {
            return {
                fileName: item.file,
                range: convertProtocolTextSpanToRange(item)
            }
        })
    })
}
