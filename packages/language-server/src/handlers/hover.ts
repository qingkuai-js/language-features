import type {
    HoverTipResult,
    GetClientConfigParams,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type { HoverHandler } from "../types/handlers"
import type { AnyObject } from "../../../../types/util"
import type { RealPath } from "../../../../types/common"

import { getCompileRes } from "../compile"
import { doHover } from "qingkuai-language-service"
import { tpic, documents, isTestingEnv, connection } from "../state"
import { LSHandler, TPICHandler } from "../../../../shared-util/constant"

export const hover: HoverHandler = async ({ textDocument, position }, token) => {
    if (token.isCancellationRequested) {
        return
    }

    const cr = await getCompileRes(documents.get(textDocument.uri)!)
    return doHover(cr, cr.getOffset(position), isTestingEnv, getCssConfig, getScriptBlockHoverTip)
}

async function getCssConfig(uri: string): Promise<AnyObject> {
    return await connection.sendRequest(LSHandler.GetClientConfig, {
        uri,
        name: "hover",
        section: "css"
    } satisfies GetClientConfigParams)
}

async function getScriptBlockHoverTip(
    fileName: RealPath,
    pos: number
): Promise<HoverTipResult | null> {
    return await tpic.sendRequest<TPICCommonRequestParams>(TPICHandler.HoverTip, { fileName, pos })
}
