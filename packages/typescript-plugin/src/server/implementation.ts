import type {
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type TS from "typescript"

import { server, session } from "../state"
import { getRealPath } from "../util/qingkuai"
import { TPICHandler } from "../../../../shared-util/constant"
import { convertProtocolTextSpanToRange } from "../util/protocol"
import { getDefaultSourceFileByFileName } from "../util/typescript"

export function attachFindImplementation() {
    server.onRequest<TPICCommonRequestParams>(TPICHandler.FindImplemention, ({ fileName, pos }) => {
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
                fileName: getRealPath(item.file),
                range: convertProtocolTextSpanToRange(item)
            } satisfies FindReferenceResultItem
        })
    })
}
