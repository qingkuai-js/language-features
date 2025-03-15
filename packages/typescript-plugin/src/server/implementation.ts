import type {
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type TS from "typescript"

import { server, session } from "../state"
import { convertProtocolTextSpanToRange } from "../util/protocol"
import { getDefaultSourceFileByFileName } from "../util/typescript"

export function attachFindImplementation() {
    server.onRequest<TPICCommonRequestParams>("findImplementation", ({ fileName, pos }) => {
        const sourceFile = getDefaultSourceFileByFileName(fileName)!
        const lineAndCharacter = sourceFile.getLineAndCharacterOfPosition(pos)
        const getImplementation = (session as any).getImplementation.bind(session)
        const implementations = getImplementation(
            {
                file: fileName,
                line: lineAndCharacter.line + 1,
                offset: lineAndCharacter.character + 1
            },
            true
        )
        if (!implementations.length) {
            return null
        }
        return implementations.map((item: TS.server.protocol.FileSpan) => {
            return {
                fileName: item.file,
                range: convertProtocolTextSpanToRange(item)
            } satisfies FindReferenceResultItem
        })
    })
}
