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
    HoverTip = "hoverTip",
    Rename = "getRenameInfo",
    UpdateConfig = "updateConfig",
    DeleteConfig = "deleteConfig",
    GetLanguageId = "getLanguageId",
    ConfigureFile = "configureFile",
    PrepareRename = "prepareRename",
    FindReference = "findReference",
    GetDiagnostic = "getDiagnostic",
    GetCompletion = "getCompletion",
    UpdateSnapshot = "updateSnapshot",
    FindDefinition = "findDefinition",
    Retransmission = "retransmission",
    DidOpen = "didOpenQingkuaiDocument",
    RenameFile = "getEditsForFileRename",
    DidClose = "didCloseQingkuaiDocument",
    GetSignatureHelp = "getSignatureHelp",
    FindImplemention = "findImplementation",
    GetNavigationTree = "getNavigationTree",
    RefreshDiagnostic = "refreshDiagnostic",
    WaitForTSCommand = "waitForTypescriptCommand",
    FindComponentTagRange = "findComponentTagRange",
    ResolveCompletionItem = "resolveCompletionItem",
    InfferedProjectAsTypescript = "InfferedLanguageServerProjectAsTypescript"
}

export enum LSHandler {
    TestLog = "qingkuai/testLog",
    RenameFile = "qingkuai/renameFile",
    InsertSnippet = "qingkuai/insertSnippet",
    GetClientConfig = "qingkuai/getClientConfig",
    PublishDiagnostic = "qingkuai/publishDiagnostics",
    ApplyWorkspaceEdit = "qingkuai/applyWorkspaceEdit",
    GetLanguageConfig = "qingkuai/getClientLanguageConfig",
    LanguageClientCreated = "qingkuai/languageClientCreated",
    CleanLanguageConfigCache = "qingkuai/cleanConfigurationCache",
    Retransmission = "qingkuai/retransmissionToTypescriptPluginIPCServer"
}
