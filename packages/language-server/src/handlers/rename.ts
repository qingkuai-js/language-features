import type { CompileResult, Pair } from "../../../../types/common"
import type { PrepareRename, RenameHandler } from "../types/handlers"
import type { RenameLocationItem, TPICCommonRequestParams } from "../../../../types/communication"

import { TP_HANDLERS } from "../../../../shared-util/constant"
import { getCompileResult, getCompileResultByPath } from "../compile"
import { tpic, documents, isTestingEnv, limitedScriptLanguageFeatures } from "../state"
import { rename as _rename, prepareRename as _prepareRename } from "qingkuai-language-service"

export const rename: RenameHandler = async ({ textDocument, position, newName }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return
    }

    const cr = await getCompileResult(document)
    const offset = cr.document.offsetAt(position)
    return _rename(cr, offset, newName, getCompileResultByPath, renameInScriptBlock)
}

export const prepareRename: PrepareRename = async ({ textDocument, position }, token) => {
    const document = documents.get(textDocument.uri)
    if (!document || token.isCancellationRequested) {
        return null
    }

    const cr = await getCompileResult(document)
    const offset = cr.document.offsetAt(position)
    return _prepareRename(cr, offset, prepareRenameInScriptBlock)
}

async function renameInScriptBlock(
    fileName: string,
    pos: number
): Promise<RenameLocationItem[] | null> {
    if (isTestingEnv || limitedScriptLanguageFeatures) {
        return null
    }
    return await tpic.sendRequest<TPICCommonRequestParams>(TP_HANDLERS.Rename, { fileName, pos })
}

async function prepareRenameInScriptBlock(
    cr: CompileResult,
    pos: number
): Promise<Pair<number> | null> {
    return await tpic.sendRequest<TPICCommonRequestParams, Pair<number>>(
        TP_HANDLERS.PrepareRename,
        {
            pos,
            fileName: cr.filePath
        }
    )
}
