import type {
    TPICCommonRequestParams,
    FindDefinitionsResultItem
} from "../../../../types/communication"

import { tsPluginIpcServer, adapter } from "../state"
import { TP_HANDLERS } from "../../../../shared-util/constant"

export function attachFindDefinitions() {
    tsPluginIpcServer.onRequest<TPICCommonRequestParams>(TP_HANDLERS.FindDefinition, async params =>
        adapter.service.getDefinitions(params)
    )

    tsPluginIpcServer.onRequest<TPICCommonRequestParams, FindDefinitionsResultItem[] | null>(
        TP_HANDLERS.findTypeDefinition,
        params => adapter.service.getTypeDefinitions(params)
    )
}
