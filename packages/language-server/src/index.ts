import { connection } from "./state"
import { completion } from "./supports/completion"
import { diagnostic } from "./supports/diagnostic"
import { initialize } from "./supports/initialize"

connection.onCompletion(completion)
connection.onInitialize(initialize)
connection.onRequest("ping", _ => "pong")
connection.onRequest("textDocument/diagnostic", diagnostic)
