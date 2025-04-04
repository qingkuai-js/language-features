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

export const MAYBE_INVALID_COMPLETION_LABELS = new Set([
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

export enum ProjectKind {
    TS = "ts",
    JS = "js"
}

export const COMMANDS = {
    TriggerSuggest: "editor.action.triggerSuggest"
}
export const SPECIAL_TAGS = new Set(["!", "script", "style"])
export const INVALID_COMPLETION_TEXT_LABELS = new Set(["_", "__", "___"])
export const EMMET_SELF_CLOSING_TAG = new Set(["isindex", "basefont", "frame"])
