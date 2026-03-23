import type {
    FindDefinitionsResult,
    TPICCommonRequestParams,
    FindDefinitionsResultItem
} from "../../../../types/communication"
import type { CompileResult } from "../../../../types/common"
import type { DefinitionHandler, TypeDefinitionHandler } from "../types/handlers"

import { getCompileResult } from "../compile"
import { TP_HANDLERS } from "../../../../shared-util/constant"
import { tpic, documents, limitedScriptLanguageFeatures } from "../state"
import { findDefinitions as _findDefinitions } from "qingkuai-language-service"
import { findTypeDefinitions as _findTypeDefinitions } from "qingkuai-language-service"

export const findDefinitions: DefinitionHandler = async ({ textDocument, position }, token) => {
    const document = documents.get(textDocument.uri)
    if (limitedScriptLanguageFeatures || !document || token.isCancellationRequested) {
        return null
    }

    const cr = await getCompileResult(document)
    const offset = document.offsetAt(position)
    return _findDefinitions(cr, offset, findScriptBlockDefinitions)
}

export const findTypeDefinitions: TypeDefinitionHandler = async (
    { textDocument, position },
    token
) => {
    const document = documents.get(textDocument.uri)
    if (!document || limitedScriptLanguageFeatures || token.isCancellationRequested) {
        return null
    }

    const cr = await getCompileResult(document)
    const offset = document.offsetAt(position)
    return await _findTypeDefinitions(cr, offset, findScriptBlockTypeDefinitions)
}

async function findScriptBlockDefinitions(
    cr: CompileResult,
    pos: number
): Promise<FindDefinitionsResult | null> {
    return await tpic.sendRequest<TPICCommonRequestParams>(TP_HANDLERS.FindDefinition, {
        pos,
        fileName: cr.filePath
    })
}

async function findScriptBlockTypeDefinitions(
    fileName: string,
    pos: number
): Promise<FindDefinitionsResultItem[] | null> {
    return await tpic.sendRequest<TPICCommonRequestParams>(TP_HANDLERS.findTypeDefinition, {
        fileName,
        pos
    })
}
