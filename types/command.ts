import type { Location, Position } from "vscode-languageserver/node"

export namespace QingkuaiCommandTypes {
    export interface ShowReferencesParams {
        fileName: string
        position: Position
        locations: Location[]
    }
}
