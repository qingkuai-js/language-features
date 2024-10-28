import { Logger, state } from "../state"
import { connectSuccess } from "../messages"
import { InitializeHandler } from "../types/handlers"
import { TextDocumentSyncKind } from "vscode-languageserver"

export const initialize: InitializeHandler = () => {
    state.isTestingEnv = true
    Logger.info(connectSuccess)

    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            hoverProvider: true,
            renameProvider: {
                prepareProvider: true
            },
            diagnosticProvider: {
                workspaceDiagnostics: false,
                interFileDependencies: false
            },
            completionProvider: {
                triggerCharacters: [
                    ["<", ">", "!", "@", "#", "&", "-", "=", "|", "/"],

                    // prettier-ignore
                    // emmet needs trigger characters
                    [".", "+", "*", "]", "^", "$", ")", "}", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
                ].flat()
            }
        }
    }
}
