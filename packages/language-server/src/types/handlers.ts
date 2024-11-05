import type {
    Connection,
    DocumentDiagnosticParams,
    DocumentDiagnosticReport
} from "vscode-languageserver"

export type DiagnosticHandler = (
    params: DocumentDiagnosticParams
) => ResolveOrNot<DocumentDiagnosticReport | undefined>

export type HoverHander = ExtractHandler<"onHover">
export type RenameHander = ExtractHandler<"onRenameRequest">
export type PrepareRename = ExtractHandler<"onPrepareRename">
export type CompletionHandler = ExtractHandler<"onCompletion">
export type InitializeHandler = ExtractHandler<"onInitialize">

type ResolveOrNot<T> = T | Promise<T>
type ExtractHandler<T extends keyof Connection> = Connection[T] extends (...args: any) => any
    ? Parameters<Connection[T]>[0]
    : never
