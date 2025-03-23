import type TS from "typescript"
import type { RenameFileParams, RenameFileResult } from "../../../../types/communication"

import { server, session } from "../state"
import { getRealPath } from "../util/qingkuai"
import { TPICHandler } from "../../../../shared-util/constant"
import { convertProtocolTextSpanToRange } from "../util/protocol"

export function attachRenameFile() {
    server.onRequest(
        TPICHandler.RenameFile,
        ({ oldPath, newPath }: RenameFileParams): RenameFileResult => {
            const getEditsForFileRename = (session as any).getEditsForFileRename.bind(session)
            const res: TS.server.protocol.FileCodeEdits[] = getEditsForFileRename(
                {
                    oldFilePath: oldPath,
                    newFilePath: newPath
                },
                true
            )
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
