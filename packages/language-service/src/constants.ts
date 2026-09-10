import type { Command, SemanticTokensLegend } from "vscode-languageserver-types"

import { QingkuaiCommands } from "./enums"
import { constants as qingkuaiConstants } from "qingkuai/compiler"

export const META_TYPE_ID = "Meta"
export const LS_PACKAGE = "qingkuai/language-service"
export const LSU_AND_DOT = qingkuaiConstants.LSC.UTIL + "."

export const SOURCE_SPAN_MARK: unique symbol = Symbol(
    "has been converted to source text span by qingkuai-language-service"
)
export const PROXIED_MARK: unique symbol = Symbol("has been proxied by qingkuai-language-service")

export const SIGNATURE_RETRIGGER_CHARS = [")"]
export const SIGNATURE_TRIGGER_CHARS = ["(", "<", ","]

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

export const RETRIGGER_SUGGEST_COMMAND: Command = {
    title: "retrigger suggest",
    command: QingkuaiCommands.TriggerSuggest
}

export const SEMANTIC_LEGEND: SemanticTokensLegend = {
    tokenTypes: ["keyword"],
    tokenModifiers: []
}

export const SRC_IS_LINK_TAGS = new Set([
    "img",
    "script",
    "audio",
    "video",
    "source",
    "track",
    "iframe",
    "embed",
    "input"
])

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

export const INVLALID_COMPLETION_PACKAGES = new Set([
    "qingkuai/internal",
    "qingkuai/language-service"
])

export const GLOBAL_TYPE_IDS = new Set(["Props", "Refs"])
export const META_MEMBER_IDS = new Set(["props", "refs", "contexts"])
export const COMPILER_FUNCS = new Set(["rea", "der", "stc", "wat", "Wat", "waT"])
export const SCRIPT_EXTENSIONS = new Set([".d.ts", ".ts", ".tsx", ".js", ".jsx", ".json"])
