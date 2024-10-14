import {
    ServerOptions,
    TransportKind,
    LanguageClient,
    LanguageClientOptions
} from "vscode-languageclient/node"
import { workspace, ExtensionContext, window, SnippetString, languages } from "vscode"

let client: LanguageClient

export function activate(context: ExtensionContext) {
    const serverModule = context.asAbsolutePath("../../dist/server.js")

    const serverOptions: ServerOptions = {
        args: ["--nolazy"],
        module: serverModule,
        transport: TransportKind.ipc
    }

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: "file", language: "qk" }],
        synchronize: {
            fileEvents: workspace.createFileSystemWatcher("**/.clientrc")
        }
    }

    client = new LanguageClient(
        "QingKuaiLanguageServer",
        "QingKuai Language Server",
        serverOptions,
        clientOptions
    )

    client.start().then(() => {
        client.onNotification("html/automaticallyCloseTag", text => {
            window.activeTextEditor?.insertSnippet(new SnippetString(text))
        })
    })

    languages.setLanguageConfiguration("qk", {})
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined
    }
    return client.stop()
}
