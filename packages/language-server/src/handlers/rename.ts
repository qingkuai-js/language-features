import type { PrepareRename, RenameHandler } from "../types/handlers"
import type { CompileResult, NumNum, RealPath } from "../../../../types/common"
import type { RenameLocationItem, TPICCommonRequestParams } from "../../../../types/communication"

import { TPICHandler } from "../../../../shared-util/constant"
import { getCompileRes, getCompileResByPath } from "../compile"
import { tpic, documents, isTestingEnv, limitedScriptLanguageFeatures } from "../state"
import { rename as _rename, prepareRename as _prepareRename } from "qingkuai-language-service"

export const rename: RenameHandler = async ({ textDocument, position, newName }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return
    }

    const cr = await getCompileRes(document)
    return _rename(cr, cr.getOffset(position), newName, getCompileResByPath, renameInScriptBlock)
}

export const prepareRename: PrepareRename = async ({ textDocument, position }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    const cr = await getCompileRes(document)
    return _prepareRename(cr, cr.getOffset(position), prepareRenameInScriptBlock)
}

async function renameInScriptBlock(
    fileName: RealPath,
    pos: number
): Promise<RenameLocationItem[] | null> {
    if (isTestingEnv || limitedScriptLanguageFeatures) {
        return null
    }
    return await tpic.sendRequest<TPICCommonRequestParams>(TPICHandler.Rename, { fileName, pos })
}

async function prepareRenameInScriptBlock(cr: CompileResult, pos: number): Promise<NumNum | null> {
    return await tpic.sendRequest<TPICCommonRequestParams, NumNum>(TPICHandler.PrepareRename, {
        pos,
        fileName: cr.filePath
    })
}
