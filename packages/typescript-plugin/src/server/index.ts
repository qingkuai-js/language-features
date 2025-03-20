import { attachHoverTip } from "./hover"
import { attachCodeLens } from "./code-lens"
import { attachWaitCommand } from "./command"
import { attachRenameFile } from "./rename-file"
import { attachGetCompletion } from "./complete"
import { attachFindReference } from "./reference"
import { attachFindDefinition } from "./definition"
import { attachGetSignatureHelp } from "./signature"
import { runAll } from "../../../../shared-util/sundry"
import { attachFindImplementation } from "./implementation"
import { attachChangeConfig } from "./configuration/handler"
import { attachPrepareRename, attachRename } from "./rename"
import { attachGetDiagnostic, attachRefreshDiagnostic } from "./diagnostic/handler"
import { attachDocumentManager, attachGetLanguageId, attachUpdateSnapshot } from "./content/handler"

export function attachLanguageServerIPCHandlers() {
    runAll([
        attachRename,
        attachHoverTip,
        attachCodeLens,
        attachRenameFile,
        attachWaitCommand,
        attachChangeConfig,
        attachGetLanguageId,
        attachFindReference,
        attachGetDiagnostic,
        attachPrepareRename,
        attachGetCompletion,
        attachUpdateSnapshot,
        attachFindDefinition,
        attachDocumentManager,
        attachGetSignatureHelp,
        attachRefreshDiagnostic,
        attachFindImplementation
    ])
}
