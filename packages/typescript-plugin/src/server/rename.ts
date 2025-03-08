import type {
    RenameResult,
    RenameLocationItem,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type { NumNum } from "../../../../types/common"

import {
    getNodeAt,
    getDefaultProjectByFileName,
    getUserPreferencesByFileName,
    getDefaultLanguageServiceByFileName
} from "../util/typescript"
import {
    getSourceIndex,
    isComponentIdentifier,
    ensureGetSnapshotOfQingkuaiFile
} from "../util/qingkuai"
import { server, ts } from "../state"

export function attachPrepareRename() {
    server.onRequest<TPICCommonRequestParams, NumNum>("prepareRename", ({ fileName, pos }) => {
        const languageService = getDefaultLanguageServiceByFileName(fileName)
        const renameInfo = languageService?.getRenameInfo(
            fileName,
            pos,
            getUserPreferencesByFileName(fileName)
        )
        if (!renameInfo || !renameInfo.canRename) {
            return [-1, -1]
        }

        return [
            renameInfo.triggerSpan.start,
            renameInfo.triggerSpan.start + renameInfo.triggerSpan.length
        ]
    })
}

export function attachRename() {
    server.onRequest<TPICCommonRequestParams, RenameResult>("rename", ({ fileName, pos }) => {
        const project = getDefaultProjectByFileName(fileName)!
        const languageService = project.getLanguageService()
        const program = languageService.getProgram()!

        let changedComponentName = ""
        const node = getNodeAt(program.getSourceFile(fileName)!, pos)
        if (
            node &&
            ts.isIdentifier(node) &&
            isComponentIdentifier(fileName, node, program.getTypeChecker())
        ) {
            changedComponentName = node.text
        }

        const renameLocations = languageService?.findRenameLocations(
            fileName,
            pos,
            false,
            false,
            getUserPreferencesByFileName(fileName)
        )

        if (!renameLocations) {
            return { locations: [], changedComponentName }
        }

        const changes: RenameLocationItem[] = []
        renameLocations.forEach(item => {
            const { start, length } = item.textSpan
            const qingkuaiSnapshot = ensureGetSnapshotOfQingkuaiFile(item.fileName)
            const ss = getSourceIndex(qingkuaiSnapshot, start)
            const se = getSourceIndex(qingkuaiSnapshot, start + length, true)
            if (ss && se && ss !== -1 && se !== -1) {
                const locationItem: RenameLocationItem = {
                    range: [ss, se],
                    fileName: item.fileName
                }
                changes.push(locationItem)

                if (item.prefixText) {
                    locationItem.prefix = item.prefixText
                }
                if (item.suffixText) {
                    locationItem.suffix = item.suffixText
                }
            }
        })
        return { locations: changes, changedComponentName }
    })
}
