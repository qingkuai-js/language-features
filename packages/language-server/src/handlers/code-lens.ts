import type TS from "typescript"

import type {
    GetClientConfigParams,
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type { CodeLensHandler, ResolveCodeLensHandler } from "../types/handlers"
import type { CodeLensConfig, CodeLensKind } from "../../../language-service/src/types/service"

import { getCompileResult } from "../compile"
import { getCodeLens as _getCodeLens } from "qingkuai-language-service"
import { LS_HANDLERS, TP_HANDLERS } from "../../../../shared-util/constant"
import { resolveCodeLens as _resolveCodeLens } from "qingkuai-language-service"
import { connection, documents, limitedScriptLanguageFeatures, tpic } from "../state"

export const getCodeLens: CodeLensHandler = async ({ textDocument }) => {
    const document = documents.get(textDocument.uri)
    if (!document || limitedScriptLanguageFeatures) {
        return null
    }

    const cr = await getCompileResult(document)
    return _getCodeLens(cr, getTsNavigationTree, getCodeLensConfig)
}

export const resolveCodeLens: ResolveCodeLensHandler = async codeLens => {
    return _resolveCodeLens(codeLens, doResolveCodeLens)
}

async function getTsNavigationTree(fileName: string): Promise<TS.NavigationTree | null> {
    return await tpic.sendRequest<string>(TP_HANDLERS.GetNavigationTree, fileName)
}

async function getCodeLensConfig(uri: string, languageId: string): Promise<CodeLensConfig> {
    return await connection.sendRequest(LS_HANDLERS.GetClientConfig, {
        uri,
        section: languageId,
        includes: ["referencesCodeLens", "implementationsCodeLens"]
    } satisfies GetClientConfigParams)
}

async function doResolveCodeLens(
    fileName: string,
    pos: number,
    type: Omit<CodeLensKind, "assignment">
): Promise<FindReferenceResultItem[] | null> {
    const handlerName = "find" + type[0].toUpperCase() + type.slice(1)
    return await tpic.sendRequest<TPICCommonRequestParams>(handlerName, {
        fileName,
        pos
    })
}
