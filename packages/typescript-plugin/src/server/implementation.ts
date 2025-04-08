import type {
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type TS from "typescript"

import { server, session } from "../state"
import { getDefaultSourceFile } from "../util/typescript"
import { TPICHandler } from "../../../../shared-util/constant"
import { qkContext } from "qingkuai-language-service/adapters"
import { convertProtocolTextSpanToRange } from "../util/protocol"

export function attachFindImplementation() {
    server.onRequest<TPICCommonRequestParams>(TPICHandler.FindImplemention, ({ fileName, pos }) => {
        const sourceFile = getDefaultSourceFile(fileName)!
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
                fileName: qkContext.getRealPath(item.file),
                range: convertProtocolTextSpanToRange(item)
            } satisfies FindReferenceResultItem
        })
    })
}
