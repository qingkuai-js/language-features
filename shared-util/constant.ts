import type { GeneralFunc } from "../types/util"
import type { Position, Range } from "vscode-languageserver"

export const NOOP: GeneralFunc = () => {}

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

export enum TPICHandler {
    hoverTip = "hoverTip",
    rename = "getRenameInfo",
    updateConfig = "updateConfig",
    deleteConfig = "deleteConfig",
    getLanguageId = "getLanguageId",
    configureFile = "configureFile",
    prepareRename = "prepareRename",
    findReference = "findReference",
    getDiagnostic = "getDiagnostic",
    getCompletion = "getCompletion",
    updateSnapshot = "updateSnapshot",
    findDefinition = "findDefinition",
    retransmission = "retransmission",
    didOpen = "didOpenQingkuaiDocument",
    renameFile = "getEditsForFileRename",
    didClose = "didCloseQingkuaiDocument",
    getSignatureHelp = "getSignatureHelp",
    findImplemention = "findImplementation",
    getNavigationTree = "getNavigationTree",
    refreshDiagnostic = "refreshDiagnostic",
    waitForTSCommand = "waitForTypescriptCommand",
    resolveCompletionItem = "resolveCompletionItem"
}

export enum LSHandler {
    testLog = "qingkuai/testLog",
    renameFile = "qingkuai/renameFile",
    insertSnippet = "qingkuai/insertSnippet",
    getClientConfig = "qingkuai/getClientConfig",
    publishDiagnostic = "qingkuai/publishDiagnostics",
    applyWorkspaceEdit = "qingkuai/applyWorkspaceEdit",
    getLanguageConfig = "qingkuai/getClientLanguageConfig",
    languageClientCreated = "qingkuai/languageClientCreated",
    cleanLanguageConfigCache = "qingkuai/cleanConfigurationCache",
    retransmission = "qingkuai/retransmissionToTypescriptPluginIPCServer"
}
