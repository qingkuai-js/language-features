import { adapter, tsPluginIpcServer } from "../state"
import { TP_HANDLERS } from "../../../../shared-util/constant"

export function attachGetNavigationTree() {
    tsPluginIpcServer.onRequest(TP_HANDLERS.GetNavigationTree, (fileName: string) =>
        adapter.service.getNavigationTree(fileName)
    )
}
