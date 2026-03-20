import type TS from "typescript"

import type {
    TSFormattingOptions,
    TSFormatCodeSettings,
    QingkuaiConfiguration,
    PrettierConfiguration,
    ExtensionConfiguration
} from "../../../types/common"
import type { ScriptLanguageId } from "../../../types/communication"

import * as vscode from "vscode"

import nodeFs from "node:fs"
import prettier from "prettier"
import nodePath from "node:path"

import { client } from "./state"
import { LS_HANDLERS } from "../../../shared-util/constant"
import { isBoolean, isNumber } from "../../../shared-util/assert"

// 监听工作区范围内 .qingkuairc 配置文件的修改和删除事件
export function startQingkuaiConfigWatcher() {
    startConfigFileWatcher("**/.qingkuairc")
}

export function startPrettierConfigWatcher() {
    startConfigFileWatcher("**/.prettier{rc,.json,.yaml,.yml,.toml,.js,.config.js}")
}

// 向语言服务器发送清空配置缓存的通知
export function notifyServerCleanConfigCache() {
    client.sendNotification(LS_HANDLERS.CleanLanguageConfigCache, null)
}

export function getVscodeConfigTarget(config: vscode.WorkspaceConfiguration, section: string) {
    const inspected = config.inspect(section)
    if (inspected?.workspaceValue) {
        return vscode.ConfigurationTarget.Workspace
    }
    if (inspected?.workspaceFolderValue) {
        return vscode.ConfigurationTarget.WorkspaceFolder
    }
    return vscode.ConfigurationTarget.Global
}

export function getQingkuaiConfig(uri: vscode.Uri): QingkuaiConfiguration {
    let dirPath = nodePath.dirname(uri.fsPath)
    const root = nodePath.parse(uri.fsPath).root
    while (dirPath !== root) {
        const configFilePath = nodePath.resolve(dirPath, ".qingkuairc")
        if (nodeFs.existsSync(configFilePath)) {
            return loadQingkuaiConfig(configFilePath)
        }
        dirPath = nodePath.resolve(dirPath, "../")
    }
    return {
        interpretiveComments: false,
        reactivityMode: "reactive",
        whitespace: "trim-collapse",
        resolveImportExtension: true,
        shorthandDerivedDeclaration: true,
        preserveHtmlComments: "development"
    }
}

// 获取 typescript 配置项
export function getTypescriptConfig(uri: vscode.Uri, scriptLanguageId: ScriptLanguageId) {
    const options = getFormattingOptions(uri)
    return {
        preference: getTSPreferences(uri, scriptLanguageId),
        formatCodeSettings: getTSFormatCodeSettings(uri, options, scriptLanguageId)
    }
}

export async function getPrettierConfig(uri: vscode.Uri) {
    const byVscode = vscode.workspace.getConfiguration("prettier")
    const byConfigFile = await prettier.resolveConfig(uri.fsPath, {
        useCache: false,
        editorconfig: true
    })
    return Object.assign({}, byVscode as any, byConfigFile || {}) as PrettierConfiguration
}

export function getClientConfig(uri: vscode.Uri, section: string, key: string) {
    if (section === "javascript" || section === "typescript") {
        const priorityConfig = vscode.workspace.getConfiguration("js/ts", uri)
        const inspectRes = priorityConfig.inspect(`js/ts.${key}`)
        if (
            !inspectRes?.workspaceValue ||
            !inspectRes.workspaceLanguageValue ||
            !inspectRes.globalValue ||
            !inspectRes.globalLanguageValue ||
            !inspectRes.workspaceFolderValue ||
            !inspectRes.workspaceFolderLanguageValue
        ) {
            return priorityConfig.get(key)
        }
    }
    return vscode.workspace.getConfiguration(section, uri).get(key)
}

function loadQingkuaiConfig(path: string) {
    const defaultConfig: QingkuaiConfiguration = {
        whitespace: "trim-collapse",
        reactivityMode: "reactive",
        preserveHtmlComments: "never",
        interpretiveComments: true,
        resolveImportExtension: true,
        shorthandDerivedDeclaration: true
    }
    try {
        return Object.assign(
            defaultConfig,
            JSON.parse(nodeFs.readFileSync(path, "utf-8") || "{}")
        ) as QingkuaiConfiguration
    } catch {
        vscode.window
            .showWarningMessage(
                `Load configuration from "${path}" is failed, please check its contents.`,
                "Open Config File"
            )
            .then(async value => {
                if (value === "Open Config File") {
                    const document = await vscode.workspace.openTextDocument(path)
                    vscode.window.showTextDocument(document)
                }
            })
        return defaultConfig
    }
}

// 获取扩展配置项
export function getExtensionConfig(uri: vscode.Uri): ExtensionConfiguration {
    const config = vscode.workspace.getConfiguration("qingkuai", uri)
    return {
        htmlHoverTip: config.get("htmlHoverTip"),
        additionalCodeLens: config.get("additionalCodeLens"),
        hoverTipReactiveStatus: config.get("hoverTipReactiveStatus"),
        componentTagFormatPreference: config.get("componentTagFormatPreference"),
        insertSpaceAroundInterpolation: config.get("insertSpaceAroundInterpolation"),
        typescriptDiagnosticsExplain: config.get("typescriptDiagnosticsExplain"),
        componentAttributeFormatPreference: config.get("componentAttributeFormatPreference")
    } as any
}

function startConfigFileWatcher(globalPattern: string) {
    const watcher = vscode.workspace.createFileSystemWatcher(globalPattern)
    watcher.onDidCreate(notifyServerCleanConfigCache)
    watcher.onDidChange(notifyServerCleanConfigCache)
    watcher.onDidDelete(notifyServerCleanConfigCache)
}

// prettier-ignore
function getTSFormatCodeSettings(
        uri: vscode.Uri,
        options: TSFormattingOptions,
        scriptLanguageId: ScriptLanguageId
    ): TSFormatCodeSettings {
        const config = vscode.workspace.getConfiguration(`${scriptLanguageId}.format`, uri)
        return {
            newLineCharacter: "\n",
            tabSize: options.tabSize,
            indentSize: options.tabSize,
            convertTabsToSpaces: options.insertSpaces,
            indentSwitchCase: config.get<boolean>("indentSwitchCase"),
            semicolons: config.get<TS.SemicolonPreference>("semicolons"),
            insertSpaceAfterConstructor: config.get<boolean>("insertSpaceAfterConstructor"),
            insertSpaceAfterTypeAssertion: config.get<boolean>("insertSpaceAfterTypeAssertion"),
            insertSpaceAfterCommaDelimiter: config.get<boolean>("insertSpaceAfterCommaDelimiter"),
            placeOpenBraceOnNewLineForFunctions: config.get<boolean>("placeOpenBraceOnNewLineForFunctions"),
            insertSpaceBeforeFunctionParenthesis: config.get<boolean>("insertSpaceBeforeFunctionParenthesis"),
            placeOpenBraceOnNewLineForControlBlocks: config.get<boolean>("placeOpenBraceOnNewLineForControlBlocks"),
            insertSpaceAfterSemicolonInForStatements: config.get<boolean>("insertSpaceAfterSemicolonInForStatements"),
            insertSpaceBeforeAndAfterBinaryOperators: config.get<boolean>("insertSpaceBeforeAndAfterBinaryOperators"),
            insertSpaceAfterKeywordsInControlFlowStatements: config.get<boolean>("insertSpaceAfterKeywordsInControlFlowStatements"),
            insertSpaceAfterOpeningAndBeforeClosingEmptyBraces: config.get<boolean>("insertSpaceAfterOpeningAndBeforeClosingEmptyBraces"),
            insertSpaceAfterFunctionKeywordForAnonymousFunctions: config.get<boolean>("insertSpaceAfterFunctionKeywordForAnonymousFunctions"),
            insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: config.get<boolean>("insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces"),
            insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: config.get<boolean>("insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets"),
            insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: config.get<boolean>("insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis"),
            insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: config.get<boolean>("insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces"),
            insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: config.get<boolean>("insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces")
        }
    }

// prettier-ignore
function getTSPreferences(
        uri: vscode.Uri,
        scriptLanguageId: ScriptLanguageId
    ): TS.UserPreferences {
        const config = vscode.workspace.getConfiguration(scriptLanguageId, uri)
        const preferencesConfig = vscode.workspace.getConfiguration(`${scriptLanguageId}.preferences`, uri)

        const preferences: TS.UserPreferences = {
            ...config.get("unstable"),
            displayPartsForJSDoc: true,
            interactiveInlayHints: true,
            allowRenameOfImportPath: true,
            allowIncompleteCompletions: true,
            allowTextChangesInNewFiles: true,
            disableLineTextInReferences: true,
            includeCompletionsWithSnippetText: true,
            provideRefactorNotApplicableReason: true,
            useLabelDetailsInCompletionEntries: true,
            quotePreference: getQuoteStylePreference(preferencesConfig),
            includeCompletionsForModuleExports: config.get<boolean>("suggest.autoImports"),
            jsxAttributeCompletionStyle: getJsxAttributeCompletionStyle(preferencesConfig),
            autoImportFileExcludePatterns: config.get<string[]>("autoImportFileExcludePatterns"),
            importModuleSpecifierPreference: getImportModuleSpecifierPreference(preferencesConfig),
            generateReturnInDocTemplate: config.get<boolean>("suggest.jsdoc.generateReturns", true),
            importModuleSpecifierEnding: getImportModuleSpecifierEndingPreference(preferencesConfig),
            preferTypeOnlyAutoImports: preferencesConfig.get<boolean>("preferTypeOnlyAutoImports", false),
            autoImportSpecifierExcludeRegexes: preferencesConfig.get<string[]>("autoImportSpecifierExcludeRegexes"),
            includeCompletionsWithClassMemberSnippets: config.get<boolean>("suggest.classMemberSnippets.enabled", true),
            includeCompletionsForImportStatements: config.get<boolean>("suggest.includeCompletionsForImportStatements", true),
            includeAutomaticOptionalChainCompletions: config.get<boolean>("suggest.includeAutomaticOptionalChainCompletions", true),
            includeCompletionsWithObjectLiteralMethodSnippets: config.get<boolean>("suggest.objectLiteralMethodSnippets.enabled", true),
            providePrefixAndSuffixTextForRename:preferencesConfig.get<boolean>("renameShorthandProperties", true) === false ? false : preferencesConfig.get<boolean>("useAliasesForRenames", true),

            ...getInlayHintsPreferences(config),
            ...getOrganizeImportsPreferences(preferencesConfig)
        }

        return preferences
    }

function getFormattingOptions(uri: vscode.Uri): TSFormattingOptions {
    const editor = vscode.window.visibleTextEditors.find(
        editor => editor.document.uri.toString() === uri.toString()
    )
    return {
        insertSpaces: isBoolean(editor?.options.insertSpaces)
            ? editor.options.insertSpaces
            : undefined,
        tabSize: isNumber(editor?.options.tabSize) ? editor.options.tabSize : undefined
    }
}

function getQuoteStylePreference(config: vscode.WorkspaceConfiguration) {
    switch (config.get<string>("quoteStyle")) {
        case "single":
            return "single"
        case "double":
            return "double"
        default:
            return "auto"
    }
}

function getOrganizeImportsPreferences(config: vscode.WorkspaceConfiguration): TS.UserPreferences {
    return {
        organizeImportsTypeOrder: withDefaultAsUndefined(
            config.get<"auto" | "last" | "inline" | "first">("organizeImports.typeOrder", "auto"),
            "auto"
        ),
        organizeImportsNumericCollation: config.get<boolean>("organizeImports.numericCollation"),
        organizeImportsCollation: config.get<"ordinal" | "unicode">("organizeImports.collation"),
        organizeImportsIgnoreCase: withDefaultAsUndefined(
            config.get<"auto" | "caseInsensitive" | "caseSensitive">(
                "organizeImports.caseSensitivity"
            ),
            "auto"
        ),
        organizeImportsLocale: config.get<string>("organizeImports.locale"),
        organizeImportsCaseFirst: withDefaultAsUndefined(
            config.get<"default" | "upper" | "lower">("organizeImports.caseFirst", "default"),
            "default"
        ),
        organizeImportsAccentCollation: config.get<boolean>("organizeImports.accentCollation")
    }
}

function getInlayParameterNameHintsPreference(config: vscode.WorkspaceConfiguration) {
    switch (config.get<string>("inlayHints.parameterNames.enabled")) {
        case "none":
            return "none"
        case "literals":
            return "literals"
        case "all":
            return "all"
        default:
            return undefined
    }
}

function getImportModuleSpecifierPreference(config: vscode.WorkspaceConfiguration) {
    switch (config.get<string>("importModuleSpecifier")) {
        case "project-relative":
            return "project-relative"
        case "relative":
            return "relative"
        case "non-relative":
            return "non-relative"
        default:
            return undefined
    }
}

function getImportModuleSpecifierEndingPreference(config: vscode.WorkspaceConfiguration) {
    switch (config.get<string>("importModuleSpecifierEnding")) {
        case "minimal":
            return "minimal"
        case "index":
            return "index"
        case "js":
            return "js"
        default:
            return "auto"
    }
}

function getJsxAttributeCompletionStyle(config: vscode.WorkspaceConfiguration) {
    switch (config.get<string>("jsxAttributeCompletionStyle")) {
        case "braces":
            return "braces"
        case "none":
            return "none"
        default:
            return "auto"
    }
}

function getInlayHintsPreferences(config: vscode.WorkspaceConfiguration) {
    return {
        includeInlayVariableTypeHints: config.get<boolean>(
            "inlayHints.variableTypes.enabled",
            false
        ),
        includeInlayEnumMemberValueHints: config.get<boolean>(
            "inlayHints.enumMemberValues.enabled",
            false
        ),
        includeInlayFunctionParameterTypeHints: config.get<boolean>(
            "inlayHints.parameterTypes.enabled",
            false
        ),
        includeInlayFunctionLikeReturnTypeHints: config.get<boolean>(
            "inlayHints.functionLikeReturnTypes.enabled",
            false
        ),
        includeInlayPropertyDeclarationTypeHints: config.get<boolean>(
            "inlayHints.propertyDeclarationTypes.enabled",
            false
        ),
        includeInlayVariableTypeHintsWhenTypeMatchesName: !config.get<boolean>(
            "inlayHints.variableTypes.suppressWhenTypeMatchesName",
            true
        ),
        includeInlayParameterNameHintsWhenArgumentMatchesName: !config.get<boolean>(
            "inlayHints.parameterNames.suppressWhenArgumentMatchesName",
            true
        ),
        includeInlayParameterNameHints: getInlayParameterNameHintsPreference(config)
    } as const
}

function withDefaultAsUndefined<T, O extends T>(value: T, def: O): Exclude<T, O> | undefined {
    return value === def ? undefined : (value as Exclude<T, O>)
}
