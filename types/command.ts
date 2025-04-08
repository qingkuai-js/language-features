import type { Location, Position } from "vscode-languageserver/node"

export interface ShowReferencesCommandParams {
    fileName: string
    position: Position
    locations: Location[]
}
