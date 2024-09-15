import {
    ServerOptions,
    TransportKind,
    LanguageClient,
    LanguageClientOptions
} from "vscode-languageclient/node"
import { workspace, ExtensionContext, window } from "vscode"

let client: LanguageClient

export function activate(context: ExtensionContext) {
    const serverModule = context.asAbsolutePath("../qingkuai-language-server/dist/index.js")

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
        client.sendRequest("ok", { msg: "hello" }).then(res => {
            console.log(res)
        })
    })
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined
    }
    return client.stop()
}
