import type { CompletionItem, CompletionList } from "vscode-languageserver"

export interface InsertSnippetParam {
    text: string
    command?: string
}

export interface UpdateSnapshot {
    uri: string
    code: string
}

export type CompletionResult = CompletionItem[] | CompletionList | undefined | null
