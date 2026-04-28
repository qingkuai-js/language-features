import {
    SIGNATURE_TRIGGER_CHARS,
    SIGNATURE_RETRIGGER_CHARS
} from "../../../language-service/src/constants"
import { Messages } from "../messages"
import { Logger, setState } from "../state"
import { InitializeHandler } from "../types/handlers"
import { TextDocumentSyncKind } from "vscode-languageserver"
import { COMPLETION_TRIGGER_CHARS } from "qingkuai-language-service"

export const initialize: InitializeHandler = () => {
    // 测试环境下不会调用initialize
    setState({
        isTestingEnv: false
    })

    Logger.info(Messages.LanguageServerStarted)

    return {
        capabilities: {
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
            completionProvider: {
                completionItem: {
                    labelDetailsSupport: true
                },
                resolveProvider: true,
                triggerCharacters: COMPLETION_TRIGGER_CHARS
            },
            signatureHelpProvider: {
                triggerCharacters: SIGNATURE_TRIGGER_CHARS,
                retriggerCharacters: SIGNATURE_RETRIGGER_CHARS
            },
            textDocumentSync: TextDocumentSyncKind.Incremental
        }
    }
}
