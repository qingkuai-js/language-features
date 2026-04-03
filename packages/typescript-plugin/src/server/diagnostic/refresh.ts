import { adapter, tsPluginIpcServer } from "../../state"
import { debounce } from "../../../../../shared-util/sundry"
import { TP_HANDLERS } from "../../../../../shared-util/constant"
import { isQingkuaiFileName } from "../../../../../shared-util/assert"

export const refreshDiagnostics = debounce((byFileName?: string) => {
    adapter.forEachProject(project => {
        for (const fileName of project.getScriptFileNames()) {
            if (fileName === byFileName) {
                continue
            }

            const filePath = adapter.getNormalizedPath(fileName)
            if (isQingkuaiFileName(fileName)) {
                if (adapter.service.isFileOpening(fileName)) {
                    tsPluginIpcServer.sendNotification(TP_HANDLERS.RefreshDiagnostic, filePath)
                }
                adapter.service.ensureGetQingkuaiFileInfo(filePath).version++
                continue
            }

            const scriptInfo = project.getScriptInfo(fileName)
            const snapshot = project.getScriptSnapshot(fileName)
            if (!scriptInfo || !snapshot || (byFileName && !isQingkuaiFileName(byFileName))) {
                continue
            }

            const textLength = snapshot.getLength()
            scriptInfo.editContent(textLength, textLength, " ")
            scriptInfo.editContent(textLength, textLength + 1, "")
        }
        project.refreshDiagnostics()
    })
}, 350)
