import type {
    ComponentAttributeItem,
    ComponentIdentifierInfo
} from "../../../../../types/communication"
import type TS from "typescript"
import type { RealPath } from "../../../../../types/common"
import type { QingkuaiRuntimeCommonMessage } from "../../types/service"
import type { QingkuaiCompilerCommonMessage } from "../../types/service"

import {
    validIdentifierRE,
    watchCompilerFuncRE,
    reactCompilerFuncRE,
    globalTypeIdentifierRE,
    existingTopScopeIdentifierRE
} from "../../regular"
import {
    INTER_NAMESPACE,
    GlobalTypeIdentifier,
    TS_PROPS_DECLARATION_LEN,
    TS_REFS_DECLARATION_LEN,
    JS_PROPS_DECLARATION_LEN,
    JS_REFS_DECLARATION_LEN
} from "../../../../../shared-util/constant"
import {
    ts,
    path,
    getConfig,
    getCompileInfo,
    typeRefStatement,
    getFullFileNames,
    qingkuaiDiagnostics,
    getTsLanguageService,
    resolvedQingkuaiModule
} from "../state"
import {
    walk,
    getLength,
    isEventType,
    isInTopScope,
    findVariableDeclarationOfReactFunc
} from "../ts-ast"
import {
    isNull,
    isString,
    isNumber,
    debugAssert,
    isUndefined,
    isQingkuaiFileName
} from "../../../../../shared-util/assert"
import { COMPILER_FUNCS } from "../../constants"
import { stringify } from "../../../../../shared-util/sundry"
import { commonMessage as runtimeCommonMessage } from "qingkuai"
import { filePathToComponentName } from "../../../../../shared-util/qingkuai"
import { commonMessage as compilerCommonMessage, util } from "qingkuai/compiler"
import { getRealPath, isComponentIdentifier, isPositionFlagSetByInterIndex } from "../qingkuai"

export function ensureExport(
    languageService: TS.LanguageService,
    fileName: RealPath,
    content: string,
    typeDeclarationLen: number
) {
    const program = languageService.getProgram()!
    const typeChecker = program.getTypeChecker()
    const sourceFile = program.getSourceFile(fileName)!
    debugAssert(!!sourceFile)

    const dirPath = path.dir(fileName)
    const config = getConfig(fileName)
    const contentArr = content.split("")
    const existingGlobalType = new Set<string>()
    const diagnosticsCache: TS.Diagnostic[] = []
    const compileInfo = getCompileInfo(fileName)
    const storedTypes = new Map<number, string>()
    const importedQingkuaiFileNames = new Set<string>()
    const typeRefStatementLen = typeRefStatement.length
    const slotInfoKeys = Object.keys(compileInfo.slotInfo)
    const isTS = compileInfo.scriptKind === ts.ScriptKind.TS
    const qingkuaiModules = resolvedQingkuaiModule.get(fileName)
    const componentName = filePathToComponentName(path, fileName)
    const componentIdentifierInfos: ComponentIdentifierInfo[] = []
    const builtInTypeDeclarationEndIndex = typeRefStatement.length + typeDeclarationLen

    // 将每个待提取类型的索引记录到storedTypes
    slotInfoKeys.forEach(slotName => {
        compileInfo.slotInfo[slotName].properties.forEach(property => {
            if (isNumber(property[2])) {
                storedTypes.set(property[2], "")
            }
        })
    })
    qingkuaiDiagnostics.set(fileName, diagnosticsCache)

    // 将中间代码的指定范围用空白字符替换（用于需要被移除的语句）
    const eliminateContentByLength = (start: number, length: number) => {
        for (let i = 0; i < length; i++) {
            contentArr[start + i] = " "
        }
    }
    const eliminateContentByRange = (start: number, end: number) => {
        for (let i = start; i < end; i++) {
            contentArr[i] = " "
        }
    }

    // 标记已声明的全局类型标识符
    const markGlobalTypeExisting = (identifierName: string, startIndex: number) => {
        if (
            startIndex > builtInTypeDeclarationEndIndex &&
            globalTypeIdentifierRE.test(identifierName)
        ) {
            existingGlobalType.add(identifierName)
        }
    }

    // 记录qingkuai自定义诊断信息
    const recordQingkuaiDiagnostic = (
        start: number,
        length: number,
        category: TS.DiagnosticCategory,
        message: ReturnType<typeof getCompilerCommonMessage>
    ) => {
        if (isUndefined(compileInfo.itos[start]) || compileInfo.itos[start] === -1) {
            return
        }

        diagnosticsCache.push({
            start,
            length,
            category,
            source: "qk",
            file: undefined,
            code: message.code,
            messageText: message.msg
        })
    }

    // 分析中间代码AST，记录全局类型标识符的存在状态，类型别名声明和interface声明则
    // 认为当前文件已声明全局类型标识符，对于导入的标识符，需要确定其是否能作为类型使用；
    // 另外此处还处理一些与qingkuai编译器中对于脚本部分类似的检查逻辑（禁用的标识符等），
    // 因为检查模式下qingkuai编译器不会使用@babel/parser解析嵌入脚本代码以提高编译效率
    walk(sourceFile, node => {
        if (
            ts.isBinaryExpression(node) &&
            storedTypes.has(node.right.pos) &&
            node.left.getText() === INTER_NAMESPACE + ".Receiver" &&
            node.operatorToken.kind === ts.SyntaxKind.EqualsToken
        ) {
            const type = typeChecker.getTypeAtLocation(node.right)
            const typeStr = typeChecker.typeToString(type)
            storedTypes.set(node.right.pos, typeStr)
        }

        // 擦除手动实例化组件的语句
        if (
            ts.isNewExpression(node) &&
            ts.isIdentifier(node.expression) &&
            isComponentIdentifier(fileName, node.expression, typeChecker) &&
            isPositionFlagSetByInterIndex(fileName, node.getStart(), "inScript")
        ) {
            eliminateContentByRange(node.getStart(), node.expression.getStart())
            eliminateContentByRange(node.expression.getEnd(), node.getEnd())
            contentArr[node.expression.getStart() - 1] = ";"
            contentArr[node.getEnd() - 1] = ";"
            recordQingkuaiDiagnostic(
                node.getStart(),
                getLength(node),
                ts.DiagnosticCategory.Error,
                getRuntimeCommonMessage("InstantiateComponentManually")
            )
        }

        // 脚本类型为js时，检查是否通过JSDoc声明全局类型标识符
        if (!isTS && existingGlobalType.size < 2) {
            const typeDefNodes = ts.getJSDocTags(node).filter(jsDocNode => {
                return ts.isJSDocTypedefTag(jsDocNode)
            })
            if (typeDefNodes.length > 0 && isInTopScope(node)) {
                typeDefNodes.forEach(typeDefNode => {
                    markGlobalTypeExisting(
                        ts.getNameOfJSDocTypedef(typeDefNode)?.text || "",
                        typeDefNode.getStart()
                    )
                })
            }
        }

        // 脚本类型为ts时，检查是否通过类型别名或接口声明全局类型标识符
        if (isTS && (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node))) {
            isInTopScope(node) && markGlobalTypeExisting(node.name.text, node.getStart())
        }

        // 脚本类型为ts时，判断有没有通过import语句从其他文件导入全局类型标识符
        // importGlobalIdentifier为一个键为模块导出标识符名称，值为导入标识符名称的映射表，当导入
        // 标识符名称与全局类型标识符名称一致，且其可作为类型标识符使用时，视为该全局类型标识符已被声明
        if (isTS && ts.isImportDeclaration(node) && isInTopScope(node)) {
            if (!isUndefined(node.importClause?.name)) {
                const identifierName = node.importClause.name.text

                // prettier-ignore
                if (
                    globalTypeIdentifierRE.test(identifierName) &&
                    (
                        ts.SymbolFlags.Type &
                        // @ts-expect-error: access private property
                        typeChecker.getDeclaredTypeOfSymbol(node.importClause.symbol).flags
                    )
                ) {
                    existingGlobalType.add(identifierName)
                }

                if (
                    ts.isStringLiteral(node.moduleSpecifier) &&
                    qingkuaiModules?.has(node.moduleSpecifier.text)
                ) {
                    let componentFileName = path.resolve(dirPath, node.moduleSpecifier.text)
                    if (!isQingkuaiFileName(componentFileName)) {
                        componentFileName += ".qk"
                    }
                    componentIdentifierInfos.push({
                        imported: true,
                        name: identifierName,
                        relativePath: node.moduleSpecifier.text,
                        slotNams: getComponentSlotNames(componentFileName),
                        attributes: getComponentAttributes(componentFileName)
                    })
                    importedQingkuaiFileNames.add(componentFileName)
                }
            }

            // 对于命名空间导入语法无需处理，因为它并不能为qk文件声明全局类型标识符
            if (
                !isUndefined(node.importClause?.namedBindings) &&
                ts.isNamedImports(node.importClause.namedBindings)
            ) {
                for (const element of node.importClause.namedBindings.elements) {
                    const identifierName = element.name.text
                    if (
                        globalTypeIdentifierRE.test(identifierName) &&
                        // @ts-expect-error: access private property
                        ts.SymbolFlags.Type & typeChecker.getDeclaredTypeOfSymbol(element.symbol)
                    ) {
                        existingGlobalType.add(identifierName)
                    }
                }
            }
        }

        // 检查是否使用了禁止的标识符
        if (ts.isIdentifier(node) && util.isBannedIdentifier(node.text)) {
            recordQingkuaiDiagnostic(
                node.getStart(),
                getLength(node),
                ts.DiagnosticCategory.Error,
                getCompilerCommonMessage("IdentifierFormatIsNotAllowed", node.text)
            )
        }

        // 检查是否使用了export语句
        if (
            ts.isExportAssignment(node) ||
            (node as TS.HasModifiers).modifiers?.some(m => {
                return m.kind === ts.SyntaxKind.ExportKeyword
            })
        ) {
            const [start, length] = [node.getStart(), getLength(node)]
            recordQingkuaiDiagnostic(
                start,
                length,
                ts.DiagnosticCategory.Error,
                getCompilerCommonMessage("BadExportRelatedStatement")
            )
            if (ts.isExportAssignment(node)) {
                eliminateContentByLength(start, length)
            }
        }

        if (
            ts.isEnumDeclaration(node) ||
            ts.isClassDeclaration(node) ||
            ts.isModuleDeclaration(node) ||
            ts.isVariableDeclaration(node) ||
            ts.isFunctionDeclaration(node)
        ) {
            if (!isUndefined(node.name)) {
                const identifierName = node.name.getText()
                if (identifierName === "$arg") {
                    // 名称为$arg的标识符可能在内联事件处理程序中会被覆盖（警告）
                    if (isInTopScope(node)) {
                        recordQingkuaiDiagnostic(
                            node.name.getStart(),
                            getLength(node.name),
                            ts.DiagnosticCategory.Warning,
                            getCompilerCommonMessage("IdentifierMaybeOverwritten", "$arg")
                        )
                    }
                } else if (existingTopScopeIdentifierRE.test(identifierName)) {
                    // 检查是否重复声明了顶部作用域已存在的标识符（编译致命错误）
                    recordQingkuaiDiagnostic(
                        node.name.getStart(),
                        getLength(node.name),
                        ts.DiagnosticCategory.Error,
                        getCompilerCommonMessage("RegisterExsitingIdentifierName", identifierName)
                    )
                }
            }
        }

        if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            COMPILER_FUNCS.has(node.expression.text)
        ) {
            // console.log(node)
        }

        if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            COMPILER_FUNCS.has(node.expression.text)
            // && isDeclarationOfGlobalType(typeChecker.getSymbolAtLocation(node.expression))
        ) {
            const funcName = node.expression.text
            if (reactCompilerFuncRE.test(funcName)) {
                const commonDiagnosticArgs = [
                    node.getStart(),
                    getLength(node),
                    ts.DiagnosticCategory.Error
                ] as const
                if (!isInTopScope(node)) {
                    // 检查响应性声明相关编译器助手函数是否在非顶部作用域使用（编译致命错误）
                    recordQingkuaiDiagnostic(
                        ...commonDiagnosticArgs,
                        getCompilerCommonMessage("ReactCompilerFuncNotInTopScope")
                    )
                }

                const variableDeclarationNode = findVariableDeclarationOfReactFunc(node)
                if (isNull(variableDeclarationNode)) {
                    // 检查编译器响应性声明相关助手函数是否未在变量定义语句中使用（编译致命错误）
                    recordQingkuaiDiagnostic(
                        ...commonDiagnosticArgs,
                        getCompilerCommonMessage("ReactCompilerFuncWithoutVariableDeclaration")
                    )
                } else {
                    if (
                        // prettier-ignore
                        node.arguments.length === 0 &&
                        (
                            ts.isArrayBindingPattern(variableDeclarationNode.name) || 
                            ts.isObjectBindingPattern(variableDeclarationNode.name) 
                        )
                    ) {
                        // 检查编译器响应性声明相关助手函数所属的变量声明语句是否为解构声明且无参数（编译致命错误）
                        recordQingkuaiDiagnostic(
                            node.getStart(),
                            getLength(node),
                            ts.DiagnosticCategory.Error,
                            getCompilerCommonMessage("DestructureReactFuncWithNoArg", funcName)
                        )
                    }

                    if (
                        config?.convenientDerivedDeclaration &&
                        variableDeclarationNode.name.getText().startsWith("$")
                    ) {
                        if (funcName === "der") {
                            // 检查变量声明中是否混用$前缀和der方法（警告）
                            recordQingkuaiDiagnostic(
                                variableDeclarationNode.getStart(),
                                getLength(variableDeclarationNode),
                                ts.DiagnosticCategory.Warning,
                                getCompilerCommonMessage("MixTwoSyntaxOfDerived")
                            )
                        } else {
                            // 检查是否混用$前缀标识符和非der函数（具有二义性）
                            recordQingkuaiDiagnostic(
                                variableDeclarationNode.getStart(),
                                getLength(variableDeclarationNode),
                                ts.DiagnosticCategory.Error,
                                getCompilerCommonMessage(
                                    "ConvenientDerivedWithOtherReactFunc",
                                    funcName
                                )
                            )
                        }
                    }

                    // 脚本类型非ts时，检查rea、stc和der方法是否存在冗余参数
                    if (
                        !isTS &&
                        node.arguments.length > 1 &&
                        (funcName === "der" || funcName === "stc")
                    ) {
                        recordQingkuaiDiagnostic(
                            node.getStart(),
                            getLength(node),
                            ts.DiagnosticCategory.Warning,
                            getCompilerCommonMessage("RedundantArgsForCompilerFunc", funcName, 1)
                        )
                    }
                    if (!isTS && funcName === "rea" && node.arguments.length > 2) {
                        recordQingkuaiDiagnostic(
                            node.getStart(),
                            getLength(node),
                            ts.DiagnosticCategory.Warning,
                            getCompilerCommonMessage("RedundantArgsForCompilerFunc", funcName, 2)
                        )
                    }
                }
            } else if (watchCompilerFuncRE.test(funcName)) {
                if (node.arguments.length < 2) {
                    // 检查watch相关编译器助手函数是否存在缺少参数的情况（编译致命错误）
                    recordQingkuaiDiagnostic(
                        node.getStart(),
                        getLength(node),
                        ts.DiagnosticCategory.Error,
                        getCompilerCommonMessage(
                            "WatchCompilerFuncMissingArg",
                            funcName,
                            node.arguments.length
                        )
                    )
                } else if (!isTS && node.arguments.length > 2) {
                    // 脚本类型非ts时，检查watch相关编译器助手函数是否存在冗余参数（警告）
                    recordQingkuaiDiagnostic(
                        node.getStart(),
                        getLength(node),
                        ts.DiagnosticCategory.Warning,
                        getCompilerCommonMessage("RedundantArgsForCompilerFunc", funcName, 2)
                    )
                }
            }
        }
    })

    // 如果全局类型标识符已被声明，则将中间代码中的默认声明（never）部分用空白字符填充
    if (existingGlobalType.has(GlobalTypeIdentifier.Ref)) {
        if (isTS) {
            eliminateContentByLength(
                typeRefStatementLen + TS_PROPS_DECLARATION_LEN,
                TS_REFS_DECLARATION_LEN + 2
            )
        } else {
            eliminateContentByLength(
                typeRefStatementLen + JS_PROPS_DECLARATION_LEN + 1,
                JS_REFS_DECLARATION_LEN
            )
        }
    }
    if (existingGlobalType.has(GlobalTypeIdentifier.Prop)) {
        if (isTS) {
            eliminateContentByLength(typeRefStatementLen, TS_PROPS_DECLARATION_LEN)
        } else {
            eliminateContentByLength(typeRefStatementLen + 3, JS_PROPS_DECLARATION_LEN)
        }
    }

    // 根据storedTypes记录的类型组合出当前文件所表示的组件的slot类型
    const slotType = slotInfoKeys.reduce((ret, slotName, i) => {
        const { properties } = compileInfo.slotInfo[slotName]
        const key = validIdentifierRE.test(slotName) ? slotName : stringify(slotName)
        const value = properties.reduce((ret, property, i) => {
            const [name, _, iot] = property // iot: Index(of inter code) Or Type(string)
            const key = validIdentifierRE.test(name) ? name : stringify(name)
            const value = isString(iot) ? stringify(iot) : storedTypes.get(iot)
            return `${ret}${key}:${value}${i === properties.length - 1 ? "}" : ","}`
        }, "{")
        return `${ret}${key}:${value}${i === slotInfoKeys.length - 1 ? "" : ","}`
    }, "")

    // 为中间代码添加全局类型声明及默认导出语句
    if (isTS) {
        contentArr.push(`export default class ${componentName} {
            constructor(
                _: ${GlobalTypeIdentifier.Prop},
                __: ${GlobalTypeIdentifier.Ref},
                ___: {${slotType}}
            ){}
        }`)
    } else {
        contentArr.push(`export default class ${componentName} {
            /**
             * @param {${GlobalTypeIdentifier.Prop}} _
             * @param {${GlobalTypeIdentifier.Ref}} __
             * @param {{${slotType}}} __
             */
            constructor(_, __, ___){}
        }`)
    }

    for (const currentFileName of getFullFileNames()) {
        if (
            isQingkuaiFileName(currentFileName) &&
            currentFileName !== fileName.toString() &&
            !importedQingkuaiFileNames.has(currentFileName)
        ) {
            let relativePath = getRelativePathWithStartDot(dirPath, currentFileName)
            if (config?.resolveImportExtension) {
                relativePath = relativePath.slice(0, -path.ext(relativePath).length)
            }
            componentIdentifierInfos.push({
                imported: false,
                attributes: [],
                relativePath: relativePath,
                slotNams: getComponentSlotNames(currentFileName),
                name: filePathToComponentName(path, currentFileName)
            })
        }
    }
    return { content: contentArr.join(""), componentIdentifierInfos }
}

// 获取组件的attribute信息
function getComponentAttributes(componentFileName: string) {
    const program = getTsLanguageService(componentFileName)?.getProgram()!
    debugAssert(!!program)

    const sourceFile = program.getSourceFile(componentFileName)
    if (!sourceFile) {
        return []
    }

    const attributes: ComponentAttributeItem[] = []
    const typeChecker = program.getTypeChecker()

    // @ts-expect-error: access private property
    for (const [name, symbol] of sourceFile.locals) {
        if (globalTypeIdentifierRE.test(name)) {
            let type: TS.Type
            if (!ts.isJSDocTypedefTag(symbol.declarations[0])) {
                type = typeChecker.getDeclaredTypeOfSymbol(symbol)
            } else {
                type = typeChecker.getTypeFromTypeNode(symbol.declarations[0].typeExpression)
            }

            if (!type.symbol || !(type.symbol.flags & ts.SymbolFlags.Type)) {
                continue
            }

            type.getProperties().forEach(property => {
                const stringCandidates: string[] = []
                const propertyType = typeChecker.getTypeOfSymbolAtLocation(property, sourceFile)

                if (propertyType.isUnion()) {
                    propertyType.types.forEach(t => {
                        if (t.flags & ts.TypeFlags.StringLiteral) {
                            stringCandidates.push(JSON.parse(typeChecker.typeToString(t)))
                        }
                    })
                } else if (propertyType.flags & ts.TypeFlags.StringLiteral) {
                    stringCandidates.push(JSON.parse(typeChecker.typeToString(propertyType)))
                }

                attributes.push({
                    stringCandidates,
                    name: property.name,
                    kind: name.slice(0, -1),
                    type: typeChecker.typeToString(propertyType),
                    isEvent: name === GlobalTypeIdentifier.Prop && isEventType(propertyType)
                })
            })
        }
    }

    return attributes
}

export function getRelativePathWithStartDot(from: string, to: string) {
    const relativePath = path.relative(from, to)
    return /\.{1,2}\//.test(relativePath) ? relativePath : `./${relativePath}`
}

function getComponentSlotNames(componentFileName: string) {
    return Object.keys(getCompileInfo(getRealPath(componentFileName)).slotInfo)
}

// 获取编译器commonMessage中的诊断信息
function getCompilerCommonMessage<K extends keyof QingkuaiCompilerCommonMessage>(
    key: K,
    ...args: Parameters<QingkuaiCompilerCommonMessage[K][1]>
) {
    return {
        // @ts-ignore
        msg: compilerCommonMessage[key][1](...args),
        code: compilerCommonMessage[key][0]
    }
}

// 获取运行时commonMessage中的诊断信息
function getRuntimeCommonMessage<K extends keyof QingkuaiRuntimeCommonMessage>(
    key: K,
    ...args: Parameters<QingkuaiRuntimeCommonMessage[K][1]>
) {
    return {
        // @ts-ignore
        msg: runtimeCommonMessage[key][1](...args),
        code: runtimeCommonMessage[key][0]
    }
}
