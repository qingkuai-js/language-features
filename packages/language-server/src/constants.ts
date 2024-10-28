export const selfClosingTags = new Set([
    "br",
    "img",
    "input",
    "meta",
    "link",
    "hr",
    "base",
    "area",
    "col",
    "embed",
    "param",
    "source",
    "track",
    "wbr"
])

export const keyRelatedEventModifiers = new Set([
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

export const commands = {
    TriggerCommand: "editor.action.triggerSuggest"
}

export const specialTags = new Set(["!", "script", "style"])
