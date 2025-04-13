import type TS from "typescript"
import type {
    GetClientConfigParams,
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type { CodeLensHandler, ResolveCodeLensHandler } from "../types/handlers"
import type { CodeLensConfig } from "../../../language-service/src/types/service"

import { CUSTOM_PATH } from "../constants"
import { RealPath } from "../../../../types/common"
import { getCompileRes, getCompileResByPath } from "../compile"
import { codeLens as _codeLens } from "qingkuai-language-service"
import { LSHandler, TPICHandler } from "../../../../shared-util/constant"
import { resolveCodeLens as _resolveCodeLens } from "qingkuai-language-service"
import { connection, documents, limitedScriptLanguageFeatures, tpic } from "../state"

export const codeLens: CodeLensHandler = async ({ textDocument }) => {
    const document = documents.get(textDocument.uri)
    if (!document || limitedScriptLanguageFeatures) {
        return null
    }

    const cr = await getCompileRes(document)
    return _codeLens(cr, CUSTOM_PATH, getScriptNavTree, getCodeLensConfig)
}

export const resolveCodeLens: ResolveCodeLensHandler = async codeLens => {
    return _resolveCodeLens(codeLens, getCompileResByPath, sendResolveCodeLensRequest)
}

async function getScriptNavTree(fileName: RealPath): Promise<TS.NavigationTree | null> {
    return await tpic.sendRequest<string>(TPICHandler.GetNavigationTree, fileName)
}

async function getCodeLensConfig(uri: string, languageId: string): Promise<CodeLensConfig> {
    return await connection.sendRequest(LSHandler.GetClientConfig, {
        uri,
        section: languageId,
        includes: ["referencesCodeLens", "implementationsCodeLens"]
    } satisfies GetClientConfigParams)
}

async function sendResolveCodeLensRequest(
    fileName: RealPath,
    pos: number,
    type: "reference" | "implementation"
): Promise<FindReferenceResultItem[] | null> {
    const handlerName = "find" + type[0].toUpperCase() + type.slice(1)
    return await tpic.sendRequest<TPICCommonRequestParams>(handlerName, { fileName, pos })
}
