import nodePath from "node:path"

import {
    attachUpdateContent,
    attachGetLanguageId,
    attachDocumentManager,
    attachGetComponentInfos
} from "./files"
import { attachHoverTip } from "./hover"
import { tsPluginIpcServer } from "../state"
import { attachWaitCommand } from "./command"
import { attachGetCompletion } from "./complete"
import { attachFindReference } from "./reference"
import { attachGetNavigationTree } from "./navtree"
import { attachFindDefinitions } from "./definition"
import { attachGetSignatureHelp } from "./signature"
import { runAll } from "../../../../shared-util/sundry"
import { attachFindImplementation } from "./implementation"
import { attachChangeConfig } from "./configuration/handler"
import { TP_HANDLERS } from "../../../../shared-util/constant"
import { attachPrepareRename, attachRename, attachRenameFile } from "./rename"
import { attachGetDiagnostic, attachRefreshDiagnostic } from "./diagnostic/handler"

export function attachLanguageServerIPCHandlers() {
    runAll([
        attachRename,
        attachHoverTip,
        attachRenameFile,
        attachWaitCommand,
        attachChangeConfig,
        attachGetLanguageId,
        attachFindReference,
        attachGetDiagnostic,
        attachPrepareRename,
        attachGetCompletion,
        attachUpdateContent,
        attachFindDefinitions,
        attachDocumentManager,
        attachGetSignatureHelp,
        attachGetNavigationTree,
        attachRefreshDiagnostic,
        attachGetComponentInfos,
        attachFindImplementation
    ])
}
