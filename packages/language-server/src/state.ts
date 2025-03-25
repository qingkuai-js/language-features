import type { SetStateOptions } from "./types/service"

import { ProjectKind } from "./constants"
import { createLogger } from "../../../shared-util/log"
import { isUndefined } from "../../../shared-util/assert"
import { TextDocument } from "vscode-languageserver-textdocument"
import { generatePromiseAndResolver } from "../../../shared-util/sundry"
import { defaultParticipant } from "../../../shared-util/ipc/participant"
import { TextDocuments, ProposedFeatures, createConnection } from "vscode-languageserver/node"

export let isTestingEnv = true
export let typeRefStatement = ""
export let projectKind = ProjectKind.JS
export let tpic = defaultParticipant // Typescript Plugin Icp Client
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
    if (!isUndefined(options.typeRefStatement)) {
        typeRefStatement = options.typeRefStatement
    }
    if (!isUndefined(options.limitedScriptLanguageFeatures)) {
        limitedScriptLanguageFeatures = options.limitedScriptLanguageFeatures
    }
}

export const documents = new TextDocuments(TextDocument)
export const waittingCommands = new Map<string, string>()
export const Logger = createLogger({ write: console.log })
export const cachedDocuments = new Map<string, TextDocument>()
export const connection = createConnection(ProposedFeatures.all)

// 若script语言功能受限，需连接ts server
if (limitedScriptLanguageFeatures) {
    tpicConnectedResolver()
}

connection.listen()
documents.listen(connection)
