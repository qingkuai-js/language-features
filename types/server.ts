import type { CompletionItem, CompletionList } from "vscode-languageserver"

export interface InsertSnippetParam {
    text: string
    command?: string
}

export type CompletionResult = CompletionItem[] | CompletionList | undefined | null
