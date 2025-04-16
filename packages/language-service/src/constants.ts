export enum ProjectKind {
    TS = "ts",
    JS = "js"
}

export enum Commands {
    TriggerSuggest = "editor.action.triggerSuggest"
}

export const COMPLETION_TRIGGER_CHARS = [
    ["<", ">", "!", "@", "#", "&", "-", "=", "|", "/"],

    // script needs trigger characters
    [".", "'", '"', "`", ":", ",", "_", " "],

    // prettier-ignore
    // emmet needs trigger characters
    [".", "+", "*", "]", "^", "$", ")", "}", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
].flat()

export const KEY_RELATED_EVENT_MODIFIERS = new Set([
    "enter",
    "tab",
    "del",
    "esc",
    "up",
    "down",
    "left",
    "right",
    "space",
    "shift"
])

export const INVALID_COMPLETION_TEXT_LABELS = new Set([
    "_",
    "__",
    "___",
    "symbol",
    "Receiver",
    "GetKVPair",
    "GetResolve",
    "GetSlotProp",
    "SatisfyNode",
    "GetTypedValue",
    "SatisfyString",
    "SatisfyPromise",
    "SatisfyBoolean",
    "SatisfyRefGroup",
    "SatisfyComponent",
    "SatisfyHtmlDirective",
    "SatisfyTargetDirective"
])

export const COMPILER_FUNCS = new Set(["rea", "der", "stc", "wat", "Wat", "waT"])
export const SCRIPT_EXTENSIONS = new Set([".d.ts", ".ts", ".tsx", ".js", ".jsx", ".json"])
