import type {
    Connection,
    DocumentDiagnosticParams,
    DocumentDiagnosticReport
} from "vscode-languageserver"

export type DiagnosticHandler = (
    params: DocumentDiagnosticParams
) => DocumentDiagnosticReport | undefined

export type CompletionHandler = ExtraHandler<"onCompletion">
export type InitializeHandler = ExtraHandler<"onInitialize">

type ExtraHandler<T extends keyof Connection> = Connection[T] extends (...args: any) => any
    ? Parameters<Connection[T]>[0]
    : never
