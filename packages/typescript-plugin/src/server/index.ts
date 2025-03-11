import { attachHoverTip } from "./hover"
import { attachWaitCommand } from "./command"
import { attachGetCompletion } from "./complete"
import { runAll } from "../../../../shared-util/sundry"
import { attachGetDiagnostic } from "./diagnostic/handler"
import { attachChangeConfig } from "./configuration/handler"
import { attachPrepareRename, attachRename } from "./rename"
import { attachDocumentManager, attachUpdateSnapshot } from "./content/handler"

export function attachLanguageServerIPCHandlers() {
    runAll([
        attachRename,
        attachHoverTip,
        attachWaitCommand,
        attachPrepareRename,
        attachChangeConfig,
        attachGetDiagnostic,
        attachGetCompletion,
        attachUpdateSnapshot,
        attachDocumentManager
    ])
}
