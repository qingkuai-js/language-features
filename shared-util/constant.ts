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

export const DEFAULT_RANGE_WITH_CONTENT = {
    ...DEFAULT_RANGE,
    contextStart: DEFAULT_POSITION,
    contentEnd: DEFAULT_POSITION
}

export const DEFAULT_QINGKUAI_CONFIGURATION = {
    resolveImportExtension: true,
    convenientDerivedDeclaration: true
}

export const SPREAD_TAG = "qk:spread"
export const INTER_NAMESPACE = "__c__"
export const EXPORT_DEFAULT_OFFSET = 21
export const TS_REFS_DECLARATION_LEN = 27
export const JS_REFS_DECLARATION_LEN = 32
export const TS_PROPS_DECLARATION_LEN = 28
export const JS_PROPS_DECLARATION_LEN = 33

export enum GlobalTypeIdentifier {
    Ref = "Refs",
    Prop = "Props"
}

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
    GetTypeRefStatement = "getQingkuaiDtsReferenceStatement",
    Retransmission = "retransmissionToQingkuaiLanguageServer",
    InfferedProjectAsTypescript = "InfferedLanguageServerProjectAsTypescript"
}

export enum LSHandler {
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

export const GLOBAL_TYPE_IDNTIFIERS = new Set<string>([
    GlobalTypeIdentifier.Ref,
    GlobalTypeIdentifier.Prop
])
export const GLOBAL_BUILTIN_VARS = new Set(["props", "refs"])
