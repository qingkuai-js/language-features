import type { RenameFileParams, RenameFileResult } from "../../../../types/communication"

import { server } from "../state"
import { forEachProject } from "../util/typescript"
import { RefreshDiagnosticKind } from "../constant"
import { convertTextSpanToRange } from "../util/service"
import { refreshDiagnostics } from "./diagnostic/refresh"
import { TPICHandler } from "../../../../shared-util/constant"
import { isQingkuaiFileName } from "../../../../shared-util/assert"

export function attachRenameFile() {
    server.onRequest(TPICHandler.renameFile, ({ oldPath, newPath }: RenameFileParams) => {
        const result: RenameFileResult = {}
        forEachProject(project => {
            const languageService = project.getLanguageService()
            const changes = languageService.getEditsForFileRename(oldPath, newPath, {}, void 0)
            changes.forEach(({ fileName, textChanges }) => {
                if (!isQingkuaiFileName(fileName)) {
                    return
                }

                const existing = result[fileName] || (result[fileName] = [])
                textChanges.forEach(({ span, newText }) => {
                    const range = convertTextSpanToRange(fileName, span)
                    range && existing.push({ range, newText })
                })
            })
        })
        return result
    })
}
