import { InitializeParams, InitializeResult, TextDocumentSyncKind } from "vscode-languageserver"
import { connection, documents } from "../state"
import { InitializeHandler } from "../types/handlers"

export const initialize: InitializeHandler = params => {
    console.log("Keep output choice QingKuaiLanguageServer...")
    console.log(params.capabilities.textDocument?.diagnostic)

    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            diagnosticProvider: {
                workspaceDiagnostics: false,
                interFileDependencies: false
            },
            completionProvider: {
                triggerCharacters: [".", "+", "#", "*", ">", "]", ")", "^", "$", "@", "-"]
            }
        }
    }
}
