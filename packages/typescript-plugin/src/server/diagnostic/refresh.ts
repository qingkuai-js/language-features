import { adapter, tsPluginIpcServer } from "../../state"
import { debounce } from "../../../../../shared-util/sundry"
import { TP_HANDLERS } from "../../../../../shared-util/constant"
import { isQingkuaiFileName } from "../../../../../shared-util/assert"

export const refreshDiagnostics = debounce((onlyQk: boolean) => {
    adapter.forEachProject(project => {
        for (const fileName of project.getScriptFileNames()) {
            const filePath = adapter.getNormalizedPath(fileName)
            if (isQingkuaiFileName(fileName)) {
                if (adapter.service.isFileOpening(fileName)) {
                    tsPluginIpcServer.sendNotification(TP_HANDLERS.RefreshDiagnostic, filePath)
                }
                adapter.service.ensureGetQingkuaiFileInfo(filePath).version++
                continue
            }

            if (onlyQk) {
                continue
            }

            const scriptInfo = project.getScriptInfo(fileName)
            const snapshot = project.getScriptSnapshot(fileName)
            if (!scriptInfo || !snapshot) {
                continue
            }

            const textLength = snapshot.getLength()
            scriptInfo.editContent(textLength, textLength, " ")
            scriptInfo.editContent(textLength, textLength + 1, "")
        }
        project.refreshDiagnostics()
    })
}, 350)
