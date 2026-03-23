import type TS from "typescript"

import type {
    RenameLocationItem,
    TPICCommonRequestParams
} from "../../../../../types/communication"
import type { TypescriptAdapter } from "../adapter"
import type { Pair } from "../../../../../types/common"

import { isIndexesInvalid } from "../../../../../shared-util/qingkuai"
import { debugAssert, isQingkuaiFileName } from "../../../../../shared-util/assert"

export function getAndConvertRenameLocations(
    adapter: TypescriptAdapter,
    params: TPICCommonRequestParams
): RenameLocationItem[] | null {
    const filePath = adapter.getNormalizedPath(params.fileName)
    const languageService = adapter.getDefaultLanguageService(filePath)!
    if (!debugAssert(languageService)) {
        return null
    }

    const locations: RenameLocationItem[] = []
    const existingMap = new Map<string, Set<string>>()
    const renameLocations = languageService.findRenameLocations(
        filePath,
        params.pos,
        false,
        false,
        adapter.getUserPreferences(filePath)
    )
    if (!renameLocations) {
        return null
    }

    renameLocations.forEach(item => {
        const { start, length } = item.textSpan
        const targetFilePath = adapter.getNormalizedPath(item.fileName)
        const locationItem: RenameLocationItem = { fileName: targetFilePath }
        ;[locationItem.prefix, locationItem.suffix] = [item.prefixText, item.suffixText]

        if (isQingkuaiFileName(item.fileName)) {
            const targetFileInfo = adapter.service.ensureGetQingkuaiFileInfo(targetFilePath)
            const existing = existingMap.get(targetFilePath) || new Set()
            const sourceStart = targetFileInfo.getSourceIndex(start)
            const sourceEnd = targetFileInfo.getSourceIndex(start + length)
            const existringKey = `${sourceStart},${sourceEnd}`
            if (isIndexesInvalid(sourceStart, sourceEnd)) {
                return
            }
            existing.add(existringKey)
            existingMap.set(targetFilePath, existing)
            locationItem.range = [sourceStart, sourceEnd]
        } else {
            const targetSourceFile = adapter.getDefaultSourceFile(targetFilePath)!
            if (!debugAssert(targetSourceFile)) {
                return
            }
            locationItem.loc = {
                start: targetSourceFile.getLineAndCharacterOfPosition(start),
                end: targetSourceFile.getLineAndCharacterOfPosition(start + length)
            }
        }

        locations.push(locationItem)
    })
    return locations
}

export function getAndConvertPrepareRenameLocation(
    adapter: TypescriptAdapter,
    params: TPICCommonRequestParams
): Pair<number> | null {
    const filePath = adapter.getNormalizedPath(params.fileName)
    const languageService = adapter.getDefaultLanguageService(filePath)!
    if (!debugAssert(languageService)) {
        return null
    }

    const renameInfo = languageService.getRenameInfo(
        filePath,
        params.pos,
        adapter.getUserPreferences(filePath)
    )
    if (!renameInfo || !renameInfo.canRename) {
        return null
    }
    return [
        renameInfo.triggerSpan.start,
        renameInfo.triggerSpan.start + renameInfo.triggerSpan.length
    ]
}

// 非 qingkuai 文件获取重命名位置信息时，将 qingkuai 文件的位置信息修改到原始位置
export function proxyFindRenameLocationsToConvert(
    adapter: TypescriptAdapter,
    project: TS.server.Project
) {
    const languageService = project.getLanguageService()
    const findRenameLocations = languageService.findRenameLocations
    languageService.findRenameLocations = (fileName, pos, ...rest) => {
        // @ts-ignore
        const originalRet = findRenameLocations.call(languageService, fileName, pos, ...rest)

        /**
         * 由 qingkuai 文件获取时此处不做处理，转而在 {@link getAndConvertPrepareRenameLocation} 中处理
         */
        if (!originalRet?.length || isQingkuaiFileName(fileName)) {
            return originalRet
        }

        return originalRet.filter(item => {
            const locationConvertor = adapter.service.createLocationConvertor(item.fileName)
            return (
                locationConvertor.textSpan.defaultValue !==
                (item.textSpan = locationConvertor.textSpan.toSourceTextSpan(item.textSpan))
            )
        })
    }
}
