import {
    ServerOptions,
    TransportKind,
    LanguageClient,
    LanguageClientOptions
} from "vscode-languageclient/node"
import type { ExtensionContext } from "vscode"
import type { InsertSnippetParam } from "../../../types/server"

import * as vsc from "vscode"

let client: LanguageClient

export async function activate(context: ExtensionContext) {
    const serverModule = context.asAbsolutePath("../../dist/server.js")
    const languageStatusItem = vsc.languages.createLanguageStatusItem("ls", "qk")
    languageStatusItem.text = "QingKuai Language Server"
    context.subscriptions.push(languageStatusItem)
    languageStatusItem.busy = true

    const serverOptions: ServerOptions = {
        args: ["--nolazy"],
        module: serverModule,
        transport: TransportKind.ipc
    }

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: "file", language: "qk" }],
        synchronize: {
            fileEvents: vsc.workspace.createFileSystemWatcher("**/.clientrc")
        }
    }

    await (client = new LanguageClient(
        "qingkuai",
        "QingKuai",
        serverOptions,
        clientOptions
    )).start()

    test(context)
    attachCustomHandlers()
    languageStatusItem.busy = false
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined
    }
    return client.stop()
}

// 添加自定义请求/通知处理程序
function attachCustomHandlers() {
    client.onNotification("qingkuai/insertSnippet", (params: InsertSnippetParam) => {
        vsc.window.activeTextEditor?.insertSnippet(new vsc.SnippetString(params.text))
        params.command && vsc.commands.executeCommand(params.command)
    })
}

async function test({ subscriptions }: ExtensionContext) {
    const uri = vsc.Uri.file("/Users/lianggaoqiang/Desktop/QingKuai/test-sapce/test.ts")
    const doc = await vsc.workspace.openTextDocument(uri)
    // await vsc.window.showTextDocument(doc, { preserveFocus: false })

    // setTimeout(() => {
    //     console.log(vsc.languages.getDiagnostics(doc.uri))
    // }, 2000)
}
