import { connection } from "./state"
import { hover } from "./supports/hover"
import { complete } from "./supports/complete"
import { diagnostic } from "./supports/diagnostic"
import { initialize } from "./supports/initialize"
import { prepareRename, rename } from "./supports/rename"

connection.onHover(hover)
connection.onCompletion(complete)
connection.onRenameRequest(rename)
connection.onInitialize(initialize)
connection.onPrepareRename(prepareRename)

connection.onRequest("ping", _ => "pong")
connection.onRequest("textDocument/diagnostic", diagnostic)
