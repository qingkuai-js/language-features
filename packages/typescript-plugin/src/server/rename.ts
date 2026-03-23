import type {
    RenameFileParams,
    RenameFileResult,
    RenameLocationItem,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type { Pair } from "../../../../types/common"

import { adapter, tsPluginIpcServer } from "../state"
import { TP_HANDLERS } from "../../../../shared-util/constant"

export function attachRename() {
    tsPluginIpcServer.onRequest<TPICCommonRequestParams, RenameLocationItem[] | null>(
        TP_HANDLERS.Rename,
        params => adapter.service.getRenameLocations(params)
    )
}

export function attachPrepareRename() {
    tsPluginIpcServer.onRequest<TPICCommonRequestParams, Pair<number> | null>(
        TP_HANDLERS.PrepareRename,
        params => adapter.service.getAndConvertPrepareRenameLocation(params)
    )
}

export function attachRenameFile() {
    tsPluginIpcServer.onRequest(
        TP_HANDLERS.RenameFile,
        (params: RenameFileParams): RenameFileResult => {
            const ret: RenameFileResult = []
            const oldFilePath = adapter.getNormalizedPath(params.oldPath)
            const newFilePath = adapter.getNormalizedPath(params.newPath)
            adapter.forEachProject(project => {
                const languageService = project.getLanguageService()

                // 返回结果中的 qingkuai 文件的位置信息都是基于源码的，无需进行索引映射
                // 由 ../proxy/language-service.ts 中的 proxyGetEditsForFileRename 方法修改
                const fileChanges = languageService.getEditsForFileRename(
                    oldFilePath,
                    newFilePath,
                    adapter.getFormattingOptions(oldFilePath),
                    adapter.getUserPreferences(oldFilePath)
                )
                fileChanges.forEach(item => {
                    const locationConvertor = adapter.service.createLocationConvertor(item.fileName)
                    ret.push({
                        changes: item.textChanges.map(change => {
                            return {
                                range: locationConvertor.languageServerRange.fromSourceTextSpan(
                                    change.span
                                ),
                                newText: change.newText
                            }
                        }),
                        fileName: adapter.getNormalizedPath(item.fileName)
                    })
                })
            })
            return ret
        }
    )
}
