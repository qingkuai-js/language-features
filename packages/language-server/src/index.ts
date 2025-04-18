import { connection } from "./state"
import { hover } from "./handlers/hover"
import { format } from "./handlers/format"
import { connectTsServer } from "./client"
import { cleanConfigCache } from "./compile"
import { initialize } from "./handlers/initialize"
import { renameFile } from "./handlers/rename-file"
import { findReference } from "./handlers/reference"
import { signatureHelp } from "./handlers/signature"
import { LSHandler } from "../../../shared-util/constant"
import { prepareRename, rename } from "./handlers/rename"
import { publishDiagnostics } from "./handlers/diagnostic"
import { attachDocumentHandlers } from "./handlers/document"
import { findImplementation } from "./handlers/implementation"
import { codeLens, resolveCodeLens } from "./handlers/code-lens"
import { complete, resolveCompletion } from "./handlers/complete"
import { attachRetransmissionHandlers } from "./handlers/retransmission"
import { findDefinition, findTypeDefinition } from "./handlers/definition"
import { getColorPresentations, getDocumentColor } from "./handlers/color"

attachDocumentHandlers()
attachRetransmissionHandlers()

connection.onHover(hover)
connection.onCodeLens(codeLens)
connection.onCompletion(complete)
connection.onRenameRequest(rename)
connection.onInitialize(initialize)
connection.onReferences(findReference)
connection.onDefinition(findDefinition)
connection.onDocumentFormatting(format)
connection.onPrepareRename(prepareRename)
connection.onSignatureHelp(signatureHelp)
connection.onDocumentColor(getDocumentColor)
connection.onCodeLensResolve(resolveCodeLens)
connection.onTypeDefinition(findTypeDefinition)
connection.onImplementation(findImplementation)
connection.onCompletionResolve(resolveCompletion)
connection.onColorPresentation(getColorPresentations)

// 自定义事件处理
connection.onRequest("ping", _ => "pong")
connection.onNotification(LSHandler.RenameFile, renameFile)
connection.onRequest(LSHandler.ConnectToTsServer, connectTsServer)
connection.onNotification(LSHandler.RefreshDiagnostic, publishDiagnostics)
connection.onNotification(LSHandler.CleanLanguageConfigCache, cleanConfigCache)
