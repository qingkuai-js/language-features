import { Messages } from "../messages"
import { Logger, setState } from "../state"
import { InitializeHandler } from "../types/handlers"
import { TextDocumentSyncKind } from "vscode-languageserver"
import { COMPLETION_TRIGGER_CHARS } from "qingkuai-language-service"

export const initialize: InitializeHandler = params => {
    // 测试环境下不会调用initialize
    setState({
        isTestingEnv: false
    })

    Logger.info(Messages.LanguageServerStarted)

    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            colorProvider: true,
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
                triggerCharacters: COMPLETION_TRIGGER_CHARS
            }
        }
    }
}
