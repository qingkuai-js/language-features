import { debounce, generatePromiseAndResolver } from "../../../shared-util/sundry"

export type {
    AdapterFS,
    AdapterPath,
    CompileResult,
    PromiseWithState,
    QingkuaiConfiguration,
    ComponentAttributeItem,
    ComponentInfo as ComponentIdentifierInfo
} from "../../../types/common"

export type { InsertSnippetParams } from "../../../types/communication"
export type { PrettierAndPlugins, ScriptCompletionDetail } from "./types/service"

export { doHover } from "./service/hover"
export { format } from "./service/format"
export { getDiagnostic } from "./service/diagnostic"
export { findReferences } from "./service/reference"
export { getSignatureHelp } from "./service/signature"
export { COMPLETION_TRIGGER_CHARS } from "./constants"
export { findComponentTagRanges } from "./util/qingkuai"
export { rename, prepareRename } from "./service/rename"
export { doComplete } from "./service/complete/completions"
export { findImplementations } from "./service/implementation"
export { getCodeLens, resolveCodeLens } from "./service/code-lens"
export { resolveScriptBlockCompletion } from "./service/complete/resolve"
export { getDocumentColors, getColorPresentations } from "./service/color"
export { findDefinitions, findTypeDefinitions } from "./service/definition"

export const util = { debounce, generatePromiseAndResolver }
