import type { Location, Position } from "vscode-languageserver"

export interface ShowReferencesCommandParams {
    fileName: string
    position: Position
    locations: Location[]
}
