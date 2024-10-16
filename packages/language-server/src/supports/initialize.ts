import { InitializeHandler } from "../types/handlers"
import { TextDocumentSyncKind } from "vscode-languageserver"

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
                triggerCharacters: [
                    "<",
                    ">",
                    "!",
                    "@",
                    "#",
                    "&",
                    "-",
                    "=",

                    // emmet
                    ".",
                    "+",
                    "*",
                    "]",
                    "^",
                    "$",
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                    "9",
                    "0"
                ]
            }
        }
    }
}
