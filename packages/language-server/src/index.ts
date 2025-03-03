import { connection } from "./state"
import { hover } from "./handlers/hover"
import { format } from "./handlers/format"
import { connectTsServer } from "./client"
import { clearConfigCache } from "./compile"
import { initialize } from "./handlers/initialize"
import { prepareRename, rename } from "./handlers/rename"
import { publishDiagnostics } from "./handlers/diagnostic"
import { attachDocumentHandlers } from "./handlers/document"
import { complete, resolveCompletion } from "./handlers/complete"
import { attachRetransmissionHandlers } from "./handlers/retransmission"

attachDocumentHandlers()
attachRetransmissionHandlers()

connection.onHover(hover)
connection.onCompletion(complete)
connection.onRenameRequest(rename)
connection.onInitialize(initialize)
connection.onDocumentFormatting(format)
connection.onPrepareRename(prepareRename)
connection.onCompletionResolve(resolveCompletion)

// 自定义事件处理
connection.onRequest("ping", _ => "pong")
connection.onRequest("qingkuai/extensionLoaded", connectTsServer)
connection.onNotification("qingkuai/publishDiagnostics", publishDiagnostics)
connection.onNotification("qingkuai/cleanConfigurationCache", clearConfigCache)
