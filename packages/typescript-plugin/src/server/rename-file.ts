import type TS from "typescript"
import type { RenameFileParams, RenameFileResult } from "../../../../types/communication"

import { server, session } from "../state"
import { TPICHandler } from "../../../../shared-util/constant"
import { convertProtocolTextSpanToRange } from "../util/protocol"

export function attachRenameFile() {
    server.onRequest(
        TPICHandler.RenameFile,
        ({ oldPath, newPath }: RenameFileParams): RenameFileResult => {
            const handler = (session as any).getEditsForFileRename
            const arg = { oldFilePath: oldPath, newFilePath: newPath }
            const res: TS.server.protocol.FileCodeEdits[] = handler.call(session, arg, true)
            return res.map(item => {
                return {
                    fileName: item.fileName,
                    changes: item.textChanges.map(change => {
                        return {
                            newText: change.newText,
                            range: convertProtocolTextSpanToRange(change)
                        }
                    })
                }
            })
        }
    )
}
