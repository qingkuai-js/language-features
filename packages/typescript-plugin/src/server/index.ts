import { attachHoverTip } from "./hover"
import { attachCodeLens } from "./code-lens"
import { attachWaitCommand } from "./command"
import { attachGetCompletion } from "./complete"
import { attachFindReference } from "./reference"
import { attachFindDefinition } from "./definition"
import { attachGetSignatureHelp } from "./signature"
import { runAll } from "../../../../shared-util/sundry"
import { attachGetDiagnostic } from "./diagnostic/handler"
import { attachFindImplementation } from "./implementation"
import { attachChangeConfig } from "./configuration/handler"
import { attachPrepareRename, attachRename } from "./rename"
import { attachDocumentManager, attachUpdateSnapshot } from "./content/handler"

export function attachLanguageServerIPCHandlers() {
    runAll([
        attachRename,
        attachHoverTip,
        attachCodeLens,
        attachWaitCommand,
        attachChangeConfig,
        attachFindReference,
        attachGetDiagnostic,
        attachPrepareRename,
        attachGetCompletion,
        attachUpdateSnapshot,
        attachFindDefinition,
        attachDocumentManager,
        attachGetSignatureHelp,
        attachFindImplementation
    ])
}
