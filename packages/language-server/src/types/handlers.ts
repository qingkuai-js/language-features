import type { Connection } from "vscode-languageserver"

export type HoverHander = ExtractHandler<"onHover">
export type RenameHander = ExtractHandler<"onRenameRequest">
export type PrepareRename = ExtractHandler<"onPrepareRename">
export type CompletionHandler = ExtractHandler<"onCompletion">
export type InitializeHandler = ExtractHandler<"onInitialize">
export type ResolveCompletionHandler = ExtractHandler<"onCompletionResolve">

type ExtractHandler<T extends keyof Connection> = Connection[T] extends (...args: any) => any
    ? Parameters<Connection[T]>[0]
    : never
