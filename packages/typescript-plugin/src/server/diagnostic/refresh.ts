import { adapter, tsPluginIpcServer } from "../../state"
import { debounce } from "../../../../../shared-util/sundry"
import { TP_HANDLERS } from "../../../../../shared-util/constant"
import { isQingkuaiFileName } from "../../../../../shared-util/assert"

export const refreshDiagnostics = debounce(() => {
    adapter.forEachProject(project => {
        for (const fileName of project.getScriptFileNames()) {
            const isQingkuaiFile = isQingkuaiFileName(fileName)
            const filePath = adapter.getNormalizedPath(fileName)
            if (isQingkuaiFile) {
                if (adapter.service.isFileOpening(fileName)) {
                    tsPluginIpcServer.sendNotification(TP_HANDLERS.RefreshDiagnostic, filePath)
                }
                adapter.service.ensureGetQingkuaiFileInfo(filePath).version++
                continue
            }

            const scriptInfo = project.getScriptInfo(fileName)
            const snapshot = project.getScriptSnapshot(fileName)
            if (!scriptInfo || !snapshot) {
                continue
            }

            const textLength = snapshot.getLength()
            if (snapshot.getText(textLength - 1, textLength) !== " ") {
                scriptInfo.editContent(textLength, textLength, " ")
            } else {
                scriptInfo.editContent(textLength - 1, textLength, "")
            }
        }
        project.refreshDiagnostics()
    })
}, 350)
