import type { ExtensionContext } from "vscode"

import * as vscode from "vscode"

import { client } from "./state"

// 显式注册格式化 provider，确保 VS Code 稳定识别 QingKuai 的格式化能力
// 实际格式化仍走现有 LSP 的 textDocument/formatting 请求链路
export function registerFormattingProvider(context: ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(
            { language: "qingkuai" },
            {
                async provideDocumentFormattingEdits(document, options, token) {
                    if (!client || token.isCancellationRequested) {
                        return []
                    }

                    const edits = await client.sendRequest(
                        "textDocument/formatting",
                        {
                            textDocument: {
                                uri: document.uri.toString()
                            },
                            options
                        },
                        token
                    )

                    if (!Array.isArray(edits)) {
                        return []
                    }

                    return edits.map((edit: any) => {
                        return new vscode.TextEdit(
                            new vscode.Range(
                                edit.range.start.line,
                                edit.range.start.character,
                                edit.range.end.line,
                                edit.range.end.character
                            ),
                            edit.newText
                        )
                    })
                }
            }
        )
    )
}
