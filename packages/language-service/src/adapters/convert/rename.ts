import type {
    RenameLocationItem,
    TPICCommonRequestParams
} from "../../../../../types/communication"
import type TS from "typescript"
import type { NumNum } from "../../../../../types/common"

import { getRealPath, getSourceIndex } from "../qingkuai"
import { getLineAndCharacter, getUserPreferences } from "../state"
import { isQingkuaiFileName } from "../../../../../shared-util/assert"
import { isIndexesInvalid } from "../../../../../shared-util/qingkuai"

export function renameAndConvert(
    languageService: TS.LanguageService,
    { fileName, pos }: TPICCommonRequestParams
): RenameLocationItem[] | null {
    const locations: RenameLocationItem[] = []
    const existringMap = new Map<string, Set<string>>()
    const renameLocations = languageService.findRenameLocations(
        fileName,
        pos,
        false,
        false,
        getUserPreferences(fileName)
    )
    if (!renameLocations) {
        return null
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
            const sourceStart = getSourceIndex(item.fileName, start)
            const existing = existringMap.get(realPath) || new Set()
            const sourceEnd = getSourceIndex(item.fileName, start + length, true)
            const existringKey = `${sourceStart},${sourceEnd}`
            if (isIndexesInvalid(sourceStart, sourceEnd)) {
                return
            }
            existing.add(existringKey)
            existringMap.set(realPath, existing)
            locationItem.range = [sourceStart, sourceEnd]
        } else {
            const startLineAndCharacter = getLineAndCharacter(item.fileName, start)
            const endLineAndCharacter = getLineAndCharacter(item.fileName, start + length)
            if (!startLineAndCharacter || !endLineAndCharacter) {
                return
            }
            locationItem.loc = { start: startLineAndCharacter, end: endLineAndCharacter }
        }

        locations.push(locationItem)
    })
    return locations
}

export function prepareRenameAndConvert(
    languageService: TS.LanguageService,
    { fileName, pos }: TPICCommonRequestParams
): NumNum | null {
    const renameInfo = languageService.getRenameInfo(fileName, pos, getUserPreferences(fileName))
    if (!renameInfo || !renameInfo.canRename) {
        return null
    }
    return [
        renameInfo.triggerSpan.start,
        renameInfo.triggerSpan.start + renameInfo.triggerSpan.length
    ]
}
