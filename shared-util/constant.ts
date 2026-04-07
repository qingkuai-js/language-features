import type { GeneralFunc } from "../types/util"

export const NOOP: GeneralFunc = () => {}

export enum ProjectKind {
    TS = "ts",
    JS = "js"
}

export enum TP_HANDLERS {
    HoverTip = "hoverTip",
    Rename = "getRenameInfo",
    GetLanguageId = "getLanguageId",
    ConfigureFile = "configureFile",
    PrepareRename = "prepareRename",
    FindReference = "findReference",
    GetDiagnostic = "getDiagnostic",
    GetCompletion = "getCompletion",
    UpdateContent = "updateContent",
    FindDefinition = "findDefinition",
    DidOpen = "didOpenQingkuaiDocument",
    RenameFile = "getEditsForFileRename",
    DidClose = "didCloseQingkuaiDocument",
    GetSignatureHelp = "getSignatureHelp",
    FindImplemention = "findImplementation",
    GetNavigationTree = "getNavigationTree",
    RefreshDiagnostic = "refreshDiagnostic",
    findTypeDefinition = "findTypeDefinition",
    WaitForTSCommand = "waitForTypescriptCommand",
    FindComponentTagRange = "findComponentTagRange",
    ResolveCompletionItem = "resolveCompletionItem",
    GetComponentInfos = "getCompnentIdentifierInfos",
    Retransmission = "retransmissionToQingkuaiLanguageServer",
    InfferedProjectAsTypescript = "InfferedLanguageServerProjectAsTypescript"
}

export enum LS_HANDLERS {
    TestLog = "qingkuai/testLog",
    RenameFile = "qingkuai/renameFile",
    InsertSnippet = "qingkuai/insertSnippet",
    GetClientConfig = "qingkuai/getClientConfig",
    TsServerIsKilled = "qingkuai/tsServerIsKilled",
    RefreshDiagnostic = "qingkuai/refreshDiagnostics",
    ApplyWorkspaceEdit = "qingkuai/applyWorkspaceEdit",
    ConnectToTsServer = "qingkuai/languageClientCreated",
    GetLanguageConfig = "qingkuai/getClientLanguageConfig",
    CleanLanguageConfigCache = "qingkuai/cleanConfigurationCache",
    Retransmission = "qingkuai/retransmissionToTypescriptPluginIPCServer"
}
