import type { GeneralFunc } from "../types/util"
import type { Position, Range } from "vscode-languageserver"

export const DEFAULT_POSITION: Position = {
    line: 0,
    character: 0
}

export const DEFAULT_RANGE: Range = {
    start: DEFAULT_POSITION,
    end: DEFAULT_POSITION
}

export const NOOP: GeneralFunc = () => {}
