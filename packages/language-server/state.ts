import { TextDocument } from "vscode-languageserver-textdocument"
import { createConnection, ProposedFeatures, TextDocuments } from "vscode-languageserver/node"

export const documents = new TextDocuments(TextDocument)
export const connection = createConnection(ProposedFeatures.all)

connection.listen()
documents.listen(connection)
