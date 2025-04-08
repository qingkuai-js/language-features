import type {
    FindDefinitionResult,
    FindDefinitionParams,
    GetClientConfigParams,
    TPICCommonRequestParams,
    FindDefinitionResultItem
} from "../../../../types/communication"
import type { CompileResult, RealPath } from "../../../../types/common"
import type { DefinitionHandler, TypeDefinitionHandler } from "../types/handlers"

import { resolve } from "node:path"
import { findDefinitions } from "qingkuai-language-service"
import { findTypeDefinitions } from "qingkuai-language-service"
import { getCompileRes, getCompileResByPath } from "../compile"
import { LSHandler, TPICHandler } from "../../../../shared-util/constant"
import { tpic, documents, connection, limitedScriptLanguageFeatures } from "../state"

export const findDefinition: DefinitionHandler = async ({ textDocument, position }, token) => {
    const document = documents.get(textDocument.uri)
    if (limitedScriptLanguageFeatures || !document || token.isCancellationRequested) {
        return null
    }

    const cr = await getCompileRes(document)
    const offset = document.offsetAt(position)
    return findDefinitions(cr, offset, resolve, getCompileResByPath, findScriptBlockDefinitions)
}

export const findTypeDefinition: TypeDefinitionHandler = async (
    { textDocument, position },
    token
) => {
    const document = documents.get(textDocument.uri)
    if (!document || limitedScriptLanguageFeatures || token.isCancellationRequested) {
        return null
    }

    const cr = await getCompileRes(document)
    const offset = document.offsetAt(position)
    return await findTypeDefinitions(cr, offset, findScriptBlockTypeDefinitions)
}

async function findScriptBlockDefinitions(
    cr: CompileResult,
    pos: number
): Promise<FindDefinitionResult | null> {
    const preferGoToSourceDefinition: boolean = await connection.sendRequest(
        LSHandler.GetClientConfig,
        {
            uri: cr.uri,
            defaultValue: false,
            section: cr.scriptLanguageId,
            name: "preferGoToSourceDefinition"
        } satisfies GetClientConfigParams<boolean>
    )
    return await tpic.sendRequest<FindDefinitionParams>(TPICHandler.FindDefinition, {
        pos,
        fileName: cr.filePath,
        preferGoToSourceDefinition
    })
}

async function findScriptBlockTypeDefinitions(
    fileName: RealPath,
    pos: number
): Promise<FindDefinitionResultItem[] | null> {
    return await tpic.sendRequest<TPICCommonRequestParams>(TPICHandler.findTypeDefinition, {
        fileName,
        pos
    })
}
