import { connectSuccess } from "../messages"
import { Logger, setState } from "../state"
import { InitializeHandler } from "../types/handlers"
import { TextDocumentSyncKind } from "vscode-languageserver"

export const initialize: InitializeHandler = params => {
    // 测试环境下不会调用initialize
    setState({
        isTestingEnv: false
    })

    Logger.info(connectSuccess)

    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            hoverProvider: true,
            referencesProvider: true,
            definitionProvider: true,
            typeDefinitionProvider: true,
            implementationProvider: true,
            documentFormattingProvider: true,
            renameProvider: {
                prepareProvider: true
            },
            codeLensProvider: {
                resolveProvider: true
            },
            signatureHelpProvider: {
                triggerCharacters: ["(", "<", ","],
                retriggerCharacters: [")"]
            },
            completionProvider: {
                resolveProvider: true,
                completionItem: {
                    labelDetailsSupport: true
                },
                triggerCharacters: [
                    ["<", ">", "!", "@", "#", "&", "-", "=", "|", "/"],

                    // script needs trigger characters
                    [".", "'", '"', "`", ":", ",", "_", " "],

                    // prettier-ignore
                    // emmet needs trigger characters
                    [".", "+", "*", "]", "^", "$", ")", "}", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
                ].flat()
            }
        }
    }
}
