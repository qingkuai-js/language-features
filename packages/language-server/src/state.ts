import type { SetStateOptions } from "./types/service"

import { createLogger } from "../../../shared-util/log"
import { isUndefined } from "../../../shared-util/assert"
import { ProjectKind } from "../../../shared-util/constant"
import { setTypeScriptFromEnv } from "../../../shared-util/typescript"
import { TextDocument } from "vscode-languageserver-textdocument"
import { generatePromiseAndResolver } from "../../../shared-util/sundry"
import { DEFAULT_PARTICIPANT } from "../../../shared-util/ipc/participant"
import { TextDocuments, ProposedFeatures, createConnection } from "vscode-languageserver/node"

export let isTestingEnv = true
export let projectKind = ProjectKind.JS
export let workspaceReadyNotified = false
export let tpic = DEFAULT_PARTICIPANT // Typescript Plugin Icp Client
export let limitedScriptLanguageFeatures = process.env.LIMITED_SCRIPT !== "0"

// 一个等待tpic连接连接成功才会解决的Promise，首次编译qk代码之前会等待tpic连接成功
export let [tpicConnectedPromise, tpicConnectedResolver] = generatePromiseAndResolver()

export function setState(options: SetStateOptions) {
    if (options.tpic) {
        tpic = options.tpic
    }
    if (options.projectKind) {
        projectKind = options.projectKind
    }
    if (!isUndefined(options.isTestingEnv)) {
        isTestingEnv = options.isTestingEnv
    }
    if (options.tpicConnectedPromise) {
        tpicConnectedPromise = options.tpicConnectedPromise
    }
    if (options.tpicConnectedResolver) {
        tpicConnectedResolver = options.tpicConnectedResolver
    }
    if (!isUndefined(options.limitedScriptLanguageFeatures)) {
        limitedScriptLanguageFeatures = options.limitedScriptLanguageFeatures
    }
    if (!isUndefined(options.workspaceReadyNotified)) {
        workspaceReadyNotified = options.workspaceReadyNotified
    }
}

export const documents = new TextDocuments(TextDocument)
export const waittingCommands = new Map<string, string>()
export const Logger = createLogger({ write: console.log })
export const cachedDocuments = new Map<string, TextDocument>()
export const connection = createConnection(ProposedFeatures.all)

// 复用宿主提供的 typescript：发布包内不再附带完整的 typescript 包，这里只登记入口文件路径，
// 编译器首次使用（即首次编译）时才真正加载，避免语言服务器启动时多付一次加载开销
// Reuse the typescript provided by the host: the published extension no longer ships a full copy of
// the package, so only the entry file path is registered here. The implementation is loaded when the
// compiler is first used (the first compilation), which keeps it out of the language server startup.
setTypeScriptFromEnv()

// 若script语言功能受限，无需连接ts server
if (limitedScriptLanguageFeatures) {
    tpicConnectedResolver()
}

connection.listen()
documents.listen(connection)
