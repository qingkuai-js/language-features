import type { Connection } from "vscode-languageserver"

export type HoverHandler = ExtractHandler<"onHover">
export type CodeLensHandler = ExtractHandler<"onCodeLens">
export type ReferenceHandler = ExtractHandler<"onReferences">
export type RenameHandler = ExtractHandler<"onRenameRequest">
export type PrepareRename = ExtractHandler<"onPrepareRename">
export type CompletionHandler = ExtractHandler<"onCompletion">
export type InitializeHandler = ExtractHandler<"onInitialize">
export type DefinitionHandler = ExtractHandler<"onDefinition">
export type GetDocumentColor = ExtractHandler<"onDocumentColor">
export type FormatHandler = ExtractHandler<"onDocumentFormatting">
export type SignatureHelpHandler = ExtractHandler<"onSignatureHelp">
export type TypeDefinitionHandler = ExtractHandler<"onTypeDefinition">
export type ImplementationHandler = ExtractHandler<"onImplementation">
export type ResolveCodeLensHandler = ExtractHandler<"onCodeLensResolve">
export type GetColorPresentations = ExtractHandler<"onColorPresentation">
export type ResolveCompletionHandler = ExtractHandler<"onCompletionResolve">

type ExtractHandler<T extends keyof Connection> = Connection[T] extends (...args: any) => any
    ? Parameters<Connection[T]>[0]
    : never
