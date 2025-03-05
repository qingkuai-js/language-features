import { attachHoverTip } from "./hover/handler"
import { runAll } from "../../../../shared-util/sundry"
import { attachGetCompletion } from "./completion/handler"
import { attachGetDiagnostic } from "./diagnostic/handler"
import { attachChangeConfig } from "./configuration/handler"
import { attachDocumentManager, attachUpdateSnapshot } from "./content/handler"

export function attachLanguageServerIPCHandlers() {
    runAll([
        attachHoverTip,
        attachChangeConfig,
        attachGetDiagnostic,
        attachGetCompletion,
        attachUpdateSnapshot,
        attachDocumentManager
    ])
}
