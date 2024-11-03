import { connectSuccess } from "../messages"
import { Logger, setIsTestingEnv } from "../state"
import { InitializeHandler } from "../types/handlers"
import { TextDocumentSyncKind } from "vscode-languageserver"

export const initialize: InitializeHandler = () => {
    // 测试中不会调用initialize
    setIsTestingEnv(false)

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
