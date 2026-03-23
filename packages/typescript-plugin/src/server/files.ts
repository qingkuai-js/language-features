import type { UpdateContentParams } from "../../../../types/communication"

import { tsPluginIpcServer, adapter } from "../state"
import { refreshDiagnostics } from "./diagnostic/refresh"
import { TP_HANDLERS } from "../../../../shared-util/constant"

export function attachGetLanguageId() {
    tsPluginIpcServer.onRequest(TP_HANDLERS.GetLanguageId, (fileName: string) => {
        const fileInfo = adapter.service.ensureGetQingkuaiFileInfo(fileName)
        return fileInfo.isTS ? "typescript" : "javascript"
    })
}
export function attachGetComponentInfos() {
    tsPluginIpcServer.onRequest(TP_HANDLERS.GetComponentInfos, (fileName: string) =>
        adapter.service.getComponentInfos(fileName)
    )
}

export function attachUpdateContent() {
    tsPluginIpcServer.onRequest<UpdateContentParams>(TP_HANDLERS.UpdateContent, params => {
        const ret = adapter.service.updateQingkuaiFile(params)
        return (refreshDiagnostics(params.fileName), ret)
    })
}

export function attachDocumentManager() {
    tsPluginIpcServer.onRequest(TP_HANDLERS.DidOpen, (fileName: string) => {
        const fileInfo = adapter.service.ensureGetQingkuaiFileInfo(fileName)
        adapter.projectService.openClientFile(fileName)
        fileInfo.isOpen = true
        fileInfo.confirmTypes()
    })

    tsPluginIpcServer.onRequest(TP_HANDLERS.DidClose, (fileName: string) => {
        if (adapter.fs.exist(fileName)) {
            adapter.projectService.closeClientFile(fileName)
        } else {
            adapter.forEachProject(project => {
                const scriptInfo = project.getScriptInfo(fileName)
                scriptInfo && project.removeFile(scriptInfo, true, true)
            })
        }
        adapter.service.ensureGetQingkuaiFileInfo(fileName).isOpen = false
    })
}
