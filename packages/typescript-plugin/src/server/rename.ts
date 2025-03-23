import type { NumNum } from "../../../../types/common"
import type { RenameLocationItem, TPICCommonRequestParams } from "../../../../types/communication"

import {
    getUserPreferencesByFileName,
    getDefaultSourceFileByFileName,
    getDefaultLanguageServiceByFileName
} from "../util/typescript"
import { server, ts } from "../state"
import { TPICHandler } from "../../../../shared-util/constant"
import { isQingkuaiFileName } from "../../../../shared-util/assert"
import { getSourceIndex, ensureGetSnapshotOfQingkuaiFile, getRealPath } from "../util/qingkuai"

export function attachPrepareRename() {
    server.onRequest<TPICCommonRequestParams, NumNum>(
        TPICHandler.PrepareRename,
        ({ fileName, pos }) => {
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
        }
    )
}

export function attachRename() {
    server.onRequest<TPICCommonRequestParams, RenameLocationItem[]>(
        TPICHandler.Rename,
        ({ fileName, pos }) => {
            const locations: RenameLocationItem[] = []
            const existringMap = new Map<string, Set<string>>()
            const languageService = getDefaultLanguageServiceByFileName(fileName)
            const renameLocations = languageService?.findRenameLocations(
                fileName,
                pos,
                false,
                false,
                getUserPreferencesByFileName(fileName)
            )

            if (!renameLocations) {
                return locations
            }

            renameLocations.forEach(item => {
                const { start, length } = item.textSpan
                const realPath = getRealPath(item.fileName)
                const locationItem: RenameLocationItem = { fileName: realPath }
                if (item.prefixText) {
                    locationItem.prefix = item.prefixText
                }
                if (item.suffixText) {
                    locationItem.suffix = item.suffixText
                }

                if (isQingkuaiFileName(item.fileName)) {
                    const qingkuaiSnapshot = ensureGetSnapshotOfQingkuaiFile(realPath)
                    const sourceEnd = getSourceIndex(qingkuaiSnapshot, start + length, true)
                    const sourceStart = getSourceIndex(qingkuaiSnapshot, start)
                    const existing = existringMap.get(realPath) || new Set()
                    const existringKey = `${sourceStart},${sourceEnd}`
                    if (
                        !sourceEnd ||
                        !sourceStart ||
                        sourceEnd === -1 ||
                        sourceStart === -1 ||
                        existing.has(existringKey)
                    ) {
                        return
                    }
                    existing.add(existringKey)
                    existringMap.set(realPath, existing)
                    locationItem.range = [sourceStart, sourceEnd]
                } else {
                    const sourceFile = getDefaultSourceFileByFileName(item.fileName)
                    if (!sourceFile) {
                        return
                    }
                    locationItem.loc = {
                        start: ts.getLineAndCharacterOfPosition(sourceFile, start),
                        end: ts.getLineAndCharacterOfPosition(sourceFile, start + length)
                    }
                }

                locations.push(locationItem)
            })

            return locations
        }
    )
}
