import type { CompileResult } from "qingkuai-language-service"
import type { ResolveFilePathParams } from "../../../../types/communication"

import { tpic } from "../state"
import { TP_HANDLERS } from "../../../../shared-util/constant"

export function resolveFilePath(cr: CompileResult, p: string) {
    return tpic.sendRequest<ResolveFilePathParams>(TP_HANDLERS.ResolveFilePath, {
        to: p,
        from: cr.filePath
    })
}
