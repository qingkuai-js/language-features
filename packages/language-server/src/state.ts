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
}

export const Logger = createLogger(console)
export const documents = new TextDocuments(TextDocument)
export const waittingCommands = new Map<string, string>()
export const cachedDocuments = new Map<string, TextDocument>()
export const connection = createConnection(ProposedFeatures.all)

// 一个等待tpic连接连接成功才会解决的Promise，首次编译qk代码之前会等待tpic连接成功
export const [tpicConnectedPromise, tpicConnectedResolver] = generatePromiseAndResolver()

connection.listen()
documents.listen(connection)
