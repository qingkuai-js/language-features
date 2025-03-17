import type {
    TSFormattingOptions,
    TSFormatCodeSettings,
    QingkuaiConfiguration,
    PrettierConfiguration,
    QingkuaiConfigurationWithDir
} from "../../../types/common"
import type TS from "typescript"
import type { LanguageClient } from "vscode-languageclient/node"
import type { RetransmissionParams } from "../../../types/communication"

import fs from "node:fs"
import path from "node:path"
import * as vsc from "vscode"
import prettier from "prettier"
import { LSHandler, TPICHandler } from "../../../shared-util/constant"
import { isBoolean, isNumber, isString, isUndefined } from "../../../shared-util/assert"

// 获取扩展配置项
export function getExtensionConfig(uri: vsc.Uri) {
    return vsc.workspace.getConfiguration("qingkuai", uri)
}

// 获取初始化时由.qingkuairc配置文件定义的配置项
export async function getInitQingkuaiConfig() {
    const configurations: QingkuaiConfigurationWithDir[] = []
    for (const folder of vsc.workspace.workspaceFolders ?? []) {
        const folderPath = folder.uri.fsPath
        for (const filePath of fs.readdirSync(folderPath, { recursive: true })) {
            if (isString(filePath) && filePath.endsWith(".qingkuairc")) {
                const fileAbsPath = path.join(folderPath, filePath)
                const config = await loadQingkuaiConfig(fileAbsPath)
                if (!isUndefined(config)) {
                    configurations.push({
                        ...config,
                        dir: folderPath
                    })
                }
            }
        }
    }
    return configurations
}

// 向语言服务器发送清空配置缓存的通知
export function notifyServerCleanConfigCache(client: LanguageClient) {
    client.sendNotification(LSHandler.cleanLanguageConfigCache, null)
}

// 监听工作区范围内.qingkuairc配置文件的修改和删除事件
export function startQingkuaiConfigWatcher(client: LanguageClient) {
    const watcher = vsc.workspace.createFileSystemWatcher("**/.qingkuairc", true)
    watcher.onDidChange(uri => {
        notifyServerCleanConfigCache(client)
        client.sendNotification(LSHandler.retransmission, {
            name: TPICHandler.updateConfig,
            data: {
                dir: path.dirname(uri.path),
                ...loadQingkuaiConfig(uri.path)
            }
        } satisfies RetransmissionParams)
    })
    watcher.onDidDelete(uri => {
        notifyServerCleanConfigCache(client)
        client.sendNotification(LSHandler.retransmission, {
            name: TPICHandler.deleteConfig,
            data: path.dirname(uri.path)
        } satisfies RetransmissionParams)
    })
}

export function startPrettierConfigWatcher(client: LanguageClient) {
    const watcher = vsc.workspace.createFileSystemWatcher(
        "**/.prettier{rc,.json,.yaml,.yml,.toml,.js,.config.js}"
    )
    watcher.onDidChange(() => notifyServerCleanConfigCache(client))
    watcher.onDidDelete(() => notifyServerCleanConfigCache(client))
}

// 获取typescript配置项
export function getTypescriptConfig(uri: vsc.Uri, isTypescriptDocument: boolean) {
    const options = getFormattingOptions(uri)
    if (isUndefined(options)) {
        return
    }
    return {
        preference: getTSPreferences(uri, isTypescriptDocument),
        formatCodeSettings: getTSFormatCodeSettings(uri, options, isTypescriptDocument)
    }
}

export async function getPrettierConfig(uri: vsc.Uri) {
    const byVscode = vsc.workspace.getConfiguration("prettier")
    const byConfigFile = await prettier.resolveConfig(uri.fsPath, {
        useCache: false,
        editorconfig: true
    })
    return Object.assign({}, byVscode as any, byConfigFile || {}) as PrettierConfiguration
}

async function loadQingkuaiConfig(path: string) {
    try {
        return JSON.parse(fs.readFileSync(path, "utf-8") || "{}") as QingkuaiConfiguration
    } catch {
        const value = await vsc.window.showWarningMessage(
            `Load configuration from "${path}" is failed, please check its contents.`,
            "Open Config File"
        )
        if (value === "Open Config File") {
            const document = await vsc.workspace.openTextDocument(path)
            vsc.window.showTextDocument(document)
        }
    }
}

// prettier-ignore
function getTSFormatCodeSettings(
        uri: vsc.Uri,
        options: TSFormattingOptions,
        isTypescriptDocument: boolean
    ): TSFormatCodeSettings {
        const config = vsc.workspace.getConfiguration(`${isTypescriptDocument?"type":"java"}script.format`, uri)
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
        uri: vsc.Uri,
        isTypescriptDocument: boolean
    ): TS.UserPreferences {
        const scriptKindName = isTypescriptDocument? "typescript" : "javascript"
        const config = vsc.workspace.getConfiguration(scriptKindName, uri)
        const preferencesConfig = vsc.workspace.getConfiguration(`${scriptKindName}.preferences`, uri)

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

function getFormattingOptions(uri: vsc.Uri): TSFormattingOptions | undefined {
    const editor = vsc.window.visibleTextEditors.find(
        editor => editor.document.uri.toString() === uri.toString()
    )
    if (!editor) {
        return undefined
    }

    return {
        insertSpaces: isBoolean(editor.options.insertSpaces)
            ? editor.options.insertSpaces
            : undefined,
        tabSize: isNumber(editor.options.tabSize) ? editor.options.tabSize : undefined
    }
}

function getQuoteStylePreference(config: vsc.WorkspaceConfiguration) {
    switch (config.get<string>("quoteStyle")) {
        case "single":
            return "single"
        case "double":
            return "double"
        default:
            return "auto"
    }
}

function getOrganizeImportsPreferences(config: vsc.WorkspaceConfiguration): TS.UserPreferences {
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

function getInlayParameterNameHintsPreference(config: vsc.WorkspaceConfiguration) {
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

function getImportModuleSpecifierPreference(config: vsc.WorkspaceConfiguration) {
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

function getImportModuleSpecifierEndingPreference(config: vsc.WorkspaceConfiguration) {
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

function getJsxAttributeCompletionStyle(config: vsc.WorkspaceConfiguration) {
    switch (config.get<string>("jsxAttributeCompletionStyle")) {
        case "braces":
            return "braces"
        case "none":
            return "none"
        default:
            return "auto"
    }
}

function getInlayHintsPreferences(config: vsc.WorkspaceConfiguration) {
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
