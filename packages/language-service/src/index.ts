import * as sharedUtil from "../../../shared-util/qingkuai"
import { filePathToComponentName } from "../../../shared-util/qingkuai"
import { debounce, generatePromiseAndResolver } from "../../../shared-util/sundry"

export type {
    AdapterCompileInfo,
    PrettierAndPlugins,
    ScriptCompletionDetail
} from "./types/service"
export type {
    RealPath,
    CustomFS,
    CustomPath,
    CompileResult,
    PromiseWithState,
    QingkuaiConfiguration
} from "../../../types/common"
export type { InsertSnippetParam, ComponentIdentifierInfo } from "../../../types/communication"

export { doHover } from "./service/hover"
export { format } from "./service/format"
export { getDiagnostic } from "./service/diagnostic"
export { findReferences } from "./service/reference"
export { getSignatureHelp } from "./service/signature"
export { findComponentTagRanges } from "./util/qingkuai"
export { rename, prepareRename } from "./service/rename"
export { doComplete } from "./service/complete/completions"
export { findImplementations } from "./service/implementation"
export { codeLens, resolveCodeLens } from "./service/code-lens"
export { COMPLETION_TRIGGER_CHARS, ProjectKind } from "./constants"
export { getDocumentColors, getColorPresentations } from "./service/color"
export { findDefinitions, findTypeDefinitions } from "./service/definition"
export { resolveEmmetCompletion, resolveScriptBlockCompletion } from "./service/complete/resolve"

export const util = {
    debounce,
    filePathToComponentName,
    generatePromiseAndResolver,
    getRangeGen: sharedUtil.getRangeGen,
    getPositionGen: sharedUtil.getPositionGen,
    isIndexesInvalid: sharedUtil.isIndexesInvalid,
    getInterIndexGen: sharedUtil.getInterIndexGen,
    getSourceIndexGen: sharedUtil.getSourceIndexGen,
    isPositionFlagSetGen: sharedUtil.isPositionFlagSetGen
}
