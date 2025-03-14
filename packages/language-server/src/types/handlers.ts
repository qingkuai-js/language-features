import type { Connection } from "vscode-languageserver"

export type HoverHandler = ExtractHandler<"onHover">
export type ReferenceHandler = ExtractHandler<"onReferences">
export type RenameHandler = ExtractHandler<"onRenameRequest">
export type PrepareRename = ExtractHandler<"onPrepareRename">
export type CompletionHandler = ExtractHandler<"onCompletion">
export type InitializeHandler = ExtractHandler<"onInitialize">
export type DefinitionHandler = ExtractHandler<"onDefinition">
export type FormatHandler = ExtractHandler<"onDocumentFormatting">
export type SignatureHelpHandler = ExtractHandler<"onSignatureHelp">
export type TypeDefinitionHandler = ExtractHandler<"onTypeDefinition">
export type ResolveCompletionHandler = ExtractHandler<"onCompletionResolve">

type ExtractHandler<T extends keyof Connection> = Connection[T] extends (...args: any) => any
    ? Parameters<Connection[T]>[0]
    : never
