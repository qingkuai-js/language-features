import { attachHoverTip } from "./hover"
import { attachPrepareRename, attachRename } from "./rename"
import { attachGetCompletion } from "./complete"
import { runAll } from "../../../../shared-util/sundry"
import { attachGetDiagnostic } from "./diagnostic/handler"
import { attachChangeConfig } from "./configuration/handler"
import { attachDocumentManager, attachUpdateSnapshot } from "./content/handler"

export function attachLanguageServerIPCHandlers() {
    runAll([
        attachRename,
        attachHoverTip,
        attachPrepareRename,
        attachChangeConfig,
        attachGetDiagnostic,
        attachGetCompletion,
        attachUpdateSnapshot,
        attachDocumentManager
    ])
}
