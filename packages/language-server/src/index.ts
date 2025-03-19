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

attachDocumentHandlers()
attachRetransmissionHandlers()

connection.onHover(hover)
connection.onCodeLens(codeLens)
connection.onCompletion(complete)
connection.onRenameRequest(rename)
connection.onInitialize(initialize)
connection.onReferences(findReference)
connection.onDocumentFormatting(format)
connection.onDefinition(findDefinition)
connection.onPrepareRename(prepareRename)
connection.onSignatureHelp(signatureHelp)
connection.onCodeLensResolve(resolveCodeLens)
connection.onTypeDefinition(findTypeDefinition)
connection.onImplementation(findImplementation)
connection.onCompletionResolve(resolveCompletion)

// 自定义事件处理
connection.onRequest("ping", _ => "pong")
connection.onNotification(LSHandler.renameFile, renameFile)
connection.onRequest(LSHandler.languageClientCreated, connectTsServer)
connection.onNotification(LSHandler.publishDiagnostic, publishDiagnostics)
connection.onNotification(LSHandler.cleanLanguageConfigCache, cleanConfigCache)
