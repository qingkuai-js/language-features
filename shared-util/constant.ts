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

export const EXPORT_DEFAULT_OFFSET = 21
export const TS_TYPE_DECLARATION_LEN = 119
export const JS_TYPE_DECLARATION_LEN = 114

export const NOOP: GeneralFunc = () => {}
