import type { ExtensionConfiguration } from "../../../types/common"
import type { IpcParticipant } from "../../../shared-util/ipc/types"

import { createLogger } from "../../../shared-util/log"
import { TextDocument } from "vscode-languageserver-textdocument"
import { generatePromiseAndResolver } from "../../../shared-util/sundry"
import { defaultParticipant } from "../../../shared-util/ipc/participant"
import { TextDocuments, ProposedFeatures, createConnection } from "vscode-languageserver/node"

export let isTestingEnv = true
export let typeRefStatement = ""
export let tpic = defaultParticipant // Typescript Plugin Icp Client

export let configuration: ExtensionConfiguration = {
    typescriptDiagnosticsExplain: true,
    componentTagFormatPreference: "camel",
    htmlHoverTip: ["tag", "entity", "attribute"]
}

export const setTpic = (v: IpcParticipant) => (tpic = v)
export const setIsTestingEnv = (v: boolean) => (isTestingEnv = v)
export const setTypeRefStatement = (v: string) => (typeRefStatement = v)
export const setConfiguration = (v: ExtensionConfiguration) => (configuration = v)

export const Logger = createLogger(console)
export const documents = new TextDocuments(TextDocument)
export const connection = createConnection(ProposedFeatures.all)

// 一个等待tpic连接连接成功才会解决的Promise，首次编译qk代码之前会等待tpic连接成功
export const [tpicConnectedPromise, tpicConnectedResolver] = generatePromiseAndResolver()

connection.listen()
documents.listen(connection)
