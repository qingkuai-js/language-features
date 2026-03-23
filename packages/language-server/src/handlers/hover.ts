import type {
    HoverTipResult,
    GetClientConfigParams,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type { HoverHandler } from "../types/handlers"
import type { AnyObject } from "../../../../types/util"

import { getCompileResult } from "../compile"
import { getComponentInfos } from "../client"
import { doHover } from "qingkuai-language-service"
import { tpic, documents, isTestingEnv, connection } from "../state"
import { LS_HANDLERS, TP_HANDLERS } from "../../../../shared-util/constant"

export const hover: HoverHandler = async ({ textDocument, position }, token) => {
    if (token.isCancellationRequested) {
        return
    }

    const cr = await getCompileResult(documents.get(textDocument.uri)!)
    const offset = cr.document.offsetAt(position)
    return doHover(
        cr,
        offset,
        isTestingEnv,
        getCssConfig,
        getScriptBlockHoverTip,
        getComponentInfos
    )
}

async function getCssConfig(uri: string): Promise<AnyObject> {
    return await connection.sendRequest(LS_HANDLERS.GetClientConfig, {
        uri,
        name: "hover",
        section: "css"
    } satisfies GetClientConfigParams)
}

async function getScriptBlockHoverTip(
    fileName: string,
    pos: number
): Promise<HoverTipResult | null> {
    return await tpic.sendRequest<TPICCommonRequestParams>(TP_HANDLERS.HoverTip, { fileName, pos })
}
