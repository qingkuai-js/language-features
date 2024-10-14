import type { Position } from "vscode-languageserver"

// create a new offset position base on an old position
export function offsetPosition(
    { line, character }: Position,
    lineDelta: number,
    charDelta: number
) {
    return {
        line: line + lineDelta,
        character: character + charDelta
    } satisfies Position
}
