import type { GeneralFunc } from "../types/util"

import nodeFs from "node:fs"
import nodePath from "node:path"
import { createAdapterFsWithNodeFs, createAdapterPathWithNodePath } from "./adapter"

export const NOOP: GeneralFunc = () => {}
export const IDENTIFY = <T>(value: T) => value

// 宿主（VS Code 扩展）通过该环境变量把已安装的 typescript 入口文件路径传给子进程（语言服务器、MCP 服务器）
// The host (the VS Code extension) hands the path of an installed typescript entry file to
// its child processes (the language server and the MCP server) through this variable.
export const TYPESCRIPT_ENTRY_ENV = "QINGKUAI_TYPESCRIPT_ENTRY"

export enum ProjectKind {
    TS = "ts",
    JS = "js"
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
export const ADAPTER_PATH = createAdapterPathWithNodePath(nodePath)
