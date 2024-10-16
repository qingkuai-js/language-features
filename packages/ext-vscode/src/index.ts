import {
    ServerOptions,
    TransportKind,
    LanguageClient,
    LanguageClientOptions
} from "vscode-languageclient/node"
import type { InsertSnippetParam } from "../../../types/server"

import { workspace, ExtensionContext, window, SnippetString, commands } from "vscode"

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

    client.start().then(attachHandlers)
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined
    }
    return client.stop()
}

// 添加客户端事件处理程序
function attachHandlers() {
    client.onNotification("insertSnippet", (params: InsertSnippetParam) => {
        window.activeTextEditor?.insertSnippet(new SnippetString(params.text))
        params.command && commands.executeCommand(params.command)
    })
}
