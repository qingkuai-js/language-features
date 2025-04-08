import type {
    FSMethods,
    PathMethods,
    GetFullFileNamesFunc,
    GetQingkuaiConfigFunc,
    GetUserPreferencesFunc,
    GetLineAndCharacterFunc,
    CreateLsAdaptersOptions,
    GetFormattingOptionsFunc,
    GetTsLanguageServiceFunc,
    GetAdapterCompileResultFunc,
    GetInterIndexByLineAndCharacterFunc
} from "../types/service"
import type TS from "typescript"
import type { RealPath } from "../../../../types/common"

export let ts: typeof TS
export let fs: FSMethods
export let path: PathMethods
export let typeRefStatement: string
export let typeDeclarationFilePath: string
export let getConfig: GetQingkuaiConfigFunc
export let getFullFileNames: GetFullFileNamesFunc
export let getUserPreferences: GetUserPreferencesFunc
export let getCompileInfo: GetAdapterCompileResultFunc
export let getLineAndCharacter: GetLineAndCharacterFunc
export let getTsLanguageService: GetTsLanguageServiceFunc
export let getFormattingOptions: GetFormattingOptionsFunc
export let getInterIndexByLineAndCharacter: GetInterIndexByLineAndCharacterFunc

// 将typscript中使用的文件名（NormalizedPath）转换为真实路径
export const tsFileNameToRealPath = new Map<string, RealPath>()

// import语句导入目标为目录时解析为qingkuai源文件的记录
export const resolvedQingkuaiModule = new Map<RealPath, Set<string>>()

// qingkuai自定义错误缓存
export const qingkuaiDiagnostics = new Map<RealPath, TS.Diagnostic[]>()

export function createLsAdapter(options: CreateLsAdaptersOptions) {
    ts = options.ts
    fs = options.fs
    path = options.path
    getConfig = options.getConfig
    getCompileInfo = options.getCompileInfo
    getFullFileNames = options.getFullFileNames
    getUserPreferences = options.getUserPreferences
    getLineAndCharacter = options.getLineAndCharacter
    getTsLanguageService = options.getTsLanguageService
    getFormattingOptions = options.getFormattingOptions
    typeDeclarationFilePath = options.typeDeclarationFilePath
    getInterIndexByLineAndCharacter = options.getInterIndexByLineAndCharacter
    typeRefStatement = `import {__c__,wat,waT,Wat,der,stc,rea} from "${typeDeclarationFilePath}"\n`
}
