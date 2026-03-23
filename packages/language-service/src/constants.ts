import type { Command, SemanticTokensLegend } from "vscode-languageserver-types"

import { QingkuaiCommands } from "./enums"
import { constants as qingkuaiConstants } from "qingkuai/compiler"

export const COMPLETION_TRIGGER_CHARS = [
    ["<", ">", "!", "@", "#", "&", "-", "=", "|", "/"],

    // scripts
    [".", "'", '"', "`", ":", ",", "_", " "],

    // styles
    ["["],

    // prettier-ignore
    // emmet needs trigger characters
    [".", "+", "*", "]", "^", "$", ")", "}", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
].flat()

export const SEMANTIC_LEGEND: SemanticTokensLegend = {
    tokenTypes: ["keyword"],
    tokenModifiers: []
}

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
    "EmptyObject",
    "QingkuaiComponent",
    "anyValue",
    "sign",
    "defineComponent",
    "confirmComponent",
    "getListPair",
    "getTypeDelayMarking",
    "getPromiseResolve",
    "validateString",
    "validateNumber",
    "validateBoolean",
    "validateHtmlBlockOptions",
    "validateReferenceGroup",
    "validateTargetDirectiveValue",
    "validateDomReceiver",
    "validateEventHandler"
])

export const COMPILER_FUNCS = new Set(["rea", "der", "stc", "wat", "Wat", "waT"])
export const SCRIPT_EXTENSIONS = new Set([".d.ts", ".ts", ".tsx", ".js", ".jsx", ".json"])

export const RETRIGGER_SUGGEST_COMMAND: Command = {
    title: "retrigger suggest",
    command: QingkuaiCommands.TriggerSuggest
}

export const LSU_AND_DOT = qingkuaiConstants.LANGUAGE_SERVICE_UTIL + "."

export const SOURCE_SPAN_MARK: unique symbol = Symbol(
    "has been converted to source text span by qingkuai-language-service"
)
export const PROXIED_MARK: unique symbol = Symbol("has been proxied by qingkuai-language-service")
