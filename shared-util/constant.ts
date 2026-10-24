import type { GeneralFunc } from "../types/util"

import nodeFs from "node:fs"
import nodePath from "node:path"
import { createAdapterFsWithNodeFs, createAdapterPathWithNodePath } from "./adapter"

export const NOOP: GeneralFunc = () => {}
export const IDENTIFY = <T>(value: T) => value

export enum TypeScriptSource {
    Setting = "setting",
    Bundled = "bundled",
    Workspace = "workspace"
}

export enum ProjectKind {
    TS = "ts",
    JS = "js"
}

// qingkuai 扩展注册的命令
export enum QK_COMMANDS {
    ShowReferences = "qingkuai.showReferences",
    OpenFileByPath = "qingkuai.openFileByFilePath",
    ViewServerLogs = "qingkuai.viewLanguageServerLogs",
    WaitForWorkspaceReady = "qingkuai.waitForWorkspaceReady",
    RestartLanguageServer = "qingkuai.restartLanguageServer",
    SelectTypeScriptPath = "qingkuai.selectTypeScriptPath",
    GetTypeScriptInfo = "qingkuai.getTypeScriptInfo"
}

// 扩展代码调用的 VS Code 内置命令
export enum BUILTIN_COMMANDS {
    Open = "vscode.open",
    RestartTsServer = "typescript.restartTsServer",
    EditorShowReferences = "editor.action.showReferences",
    ExecuteCompletionItemProvider = "vscode.executeCompletionItemProvider"
}

export enum TP_HANDLERS {
    HoverTip = "hoverTip",
    Rename = "getRenameInfo",
    GetInlayHint = "getInlayHint",
    GetLanguageId = "getLanguageId",
    ConfigureFile = "configureFile",
    PrepareRename = "prepareRename",
    FindReference = "findReference",
    GetDiagnostic = "getDiagnostic",
    GetCompletion = "getCompletion",
    UpdateContent = "updateContent",
    FindDefinition = "findDefinition",
    ResolveFilePath = "resolveFilePath",
    DidOpen = "didOpenQingkuaiDocument",
    RenameFile = "getEditsForFileRename",
    DidClose = "didCloseQingkuaiDocument",
    GetSignatureHelp = "getSignatureHelp",
    FindImplemention = "findImplementation",
    GetNavigationTree = "getNavigationTree",
    RefreshDiagnostic = "refreshDiagnostic",
    FindTypeDefinition = "findTypeDefinition",
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
    WorkspaceReady = "qingkuai/workspaceReady",
    GetClientConfig = "qingkuai/getClientConfig",
    TsServerIsKilled = "qingkuai/tsServerIsKilled",
    RefreshDiagnostic = "qingkuai/refreshDiagnostics",
    ConnectToTsServer = "qingkuai/languageClientCreated",
    GetLanguageConfig = "qingkuai/getClientLanguageConfig",
    CleanLanguageConfigCache = "qingkuai/cleanConfigurationCache",
    Retransmission = "qingkuai/retransmissionToTypescriptPluginIPCServer"
}

export const ADAPTER_FS = createAdapterFsWithNodeFs(nodeFs)
export const TYPESCRIPT_ENTRY_ENV = "QINGKUAI_TYPESCRIPT_ENTRY"
export const ADAPTER_PATH = createAdapterPathWithNodePath(nodePath)
