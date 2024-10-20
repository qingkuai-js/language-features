import { connection } from "./state"
import { hover } from "./supports/hover"
import { complete } from "./supports/complete"
import { diagnostic } from "./supports/diagnostic"
import { initialize } from "./supports/initialize"

connection.onHover(hover)
connection.onCompletion(complete)
connection.onInitialize(initialize)

connection.onRequest("ping", _ => "pong")
connection.onRequest("textDocument/diagnostic", diagnostic)
