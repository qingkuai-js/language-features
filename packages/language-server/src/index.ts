import { URI } from "vscode-uri"
import { connection } from "./state"
import { hover } from "./handlers/hover"
import { format } from "./handlers/format"
import { connectTsServer } from "./client"
import { cleanConfigCache } from "./compile"
import { initialize } from "./handlers/initialize"
import { renameFile } from "./handlers/rename-file"
import { findReference } from "./handlers/reference"
import { signatureHelp } from "./handlers/signature"
import { LS_HANDLERS } from "../../../shared-util/constant"
import { prepareRename, rename } from "./handlers/rename"
import { publishDiagnostics } from "./handlers/diagnostic"
import { attachDocumentHandlers } from "./handlers/document"
import { findImplementation } from "./handlers/implementation"
import { getCodeLens, resolveCodeLens } from "./handlers/code-lens"
import { complete, resolveCompletion } from "./handlers/complete"
import { attachRetransmissionHandlers } from "./handlers/retransmission"
import { getColorPresentations, getDocumentColor } from "./handlers/color"
import { findDefinitions, findTypeDefinitions } from "./handlers/definition"

attachDocumentHandlers()
attachRetransmissionHandlers()

connection.onHover(hover)
connection.onCodeLens(getCodeLens)
connection.onCompletion(complete)
connection.onRenameRequest(rename)
connection.onInitialize(initialize)
connection.onDocumentFormatting(format)
connection.onPrepareRename(prepareRename)
connection.onSignatureHelp(signatureHelp)
connection.onReferences(findReference)
connection.onDefinition(findDefinitions)
connection.onTypeDefinition(findTypeDefinitions)
connection.onImplementation(findImplementation)
connection.onDocumentColor(getDocumentColor)
connection.onCodeLensResolve(resolveCodeLens)
connection.onCompletionResolve(resolveCompletion)
connection.onColorPresentation(getColorPresentations)

// // 自定义事件处理
connection.onRequest("ping", _ => "pong")
connection.onRequest(LS_HANDLERS.ConnectToTsServer, connectTsServer)

connection.onNotification(LS_HANDLERS.RefreshDiagnostic, (fileName: string) => {
    publishDiagnostics(URI.file(fileName).toString())
})
connection.onNotification(LS_HANDLERS.RenameFile, renameFile)
connection.onNotification(LS_HANDLERS.CleanLanguageConfigCache, cleanConfigCache)
