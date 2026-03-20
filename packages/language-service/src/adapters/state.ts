// import type TS from "typescript"
// import type {
//     GetQingkuaiConfigFunc,
//     GetUserPreferencesFunc,
//     GetFormattingOptionsFunc
// } from "../types/service"
// import type { AdapterFS, AdapterPath } from "../../../../types/common"

// import {
//     proxyGetScriptKind,
//     proxyGetCompletionsAtPosition,
//     proxyResolveModuleNameLiterals,
//     proxyGetScriptSnapshot
// } from "./proxies"
// import { TypescriptAdapter } from "./instance"
// import { runAll } from "../../../../shared-util/sundry"
// import { isUndefined } from "../../../../shared-util/assert"

// export let ts: typeof TS
// export let adapterFs: AdapterFS
// export let adapterPath: AdapterPath
// export let project: TS.server.Project
// export let typeDeclarationFilePath: string
// export let languageService: TS.LanguageService
// export let getQingkuaiConfig: GetQingkuaiConfigFunc
// export let getUserPreferences: GetUserPreferencesFunc
// export let languageServiceHost: TS.LanguageServiceHost
// export let getFormattingOptions: GetFormattingOptionsFunc

// // qingkuai自定义错误缓存
// export const qingkuaiDiagnostics = new Map<TS.server.NormalizedPath, TS.Diagnostic[]>()

// // qingkuai 文件导入映射，导入方文件名 -> 被导入的 qingkuai 文件名列表
// export const resolvedQingkuaiModules = new Map<TS.server.NormalizedPath, Set<string>>()

// export function createTypescriptAdapter(options: {
//     ts: typeof TS
//     fs: AdapterFS
//     path: AdapterPath
//     project: TS.server.Project
//     typeDeclarationFilePath: string
//     languageService: TS.LanguageService
//     getQingkuaiConfig: GetQingkuaiConfigFunc
//     getUserPreferences: GetUserPreferencesFunc
//     languageServiceHost: TS.LanguageServiceHost
//     getFormattingOptions: GetFormattingOptionsFunc
// }) {
//     if (isUndefined(ts)) {
//         ;({
//             ts,
//             project,
//             languageService,
//             getQingkuaiConfig,
//             getUserPreferences,
//             languageServiceHost,
//             getFormattingOptions,
//             typeDeclarationFilePath
//         } = options)
//         ;[adapterFs, adapterPath] = [options.fs, options.path]
//     }
//     runAll([
//         proxyGetScriptKind,
//         proxyGetScriptSnapshot,
//         proxyGetCompletionsAtPosition,
//         proxyResolveModuleNameLiterals
//     ])
//     return new TypescriptAdapter()
// }

import type TS from "typescript"
import { SetStateOptions } from "../types/adapter"

export let ts: typeof TS
export let typeDeclarationFilePath: string
export let projectService: TS.server.ProjectService

export function setState(options: SetStateOptions) {
    ;({ ts, projectService, typeDeclarationFilePath } = options)
}
