import type { SlotInfo } from "qingkuai/compiler"
import type { QingKuaiCommonMessage, QingKuaiDiagnostic } from "../../types"
import type { DiagnosticCategory, HasModifiers, Node, ScriptKind } from "typescript"

import {
    walk,
    isInTopScope,
    isDeclarationOfGlobalType,
    findVariableDeclarationOfReactFunc
} from "../../ast"
import {
    endingInvalidStr,
    validIdentifierRE,
    reactCompilerFuncRE,
    watchCompilerFuncRE,
    globalTypeIdentifierRE,
    bannedIdentifierFormatRE,
    existingTopScopeIdentifierRE
} from "../../regular"
import { compilerFuncs } from "../../constant"
import { getMappingFileInfo } from "./document"
import { getConfigByFileName } from "../config"
import { commonMessage } from "qingkuai/compiler"
import { editQingKuaiScriptInfo } from "./scriptInfo"
import { stringify } from "../../../../../shared-util/sundry"
import { isNull, isNumber, isString, isUndefined } from "../../../../../shared-util/assert"
import { ts, languageService, qingkuaiDiagnostics, resolvedQingkuaiModule } from "../../state"

export function updateQingkuaiSnapshot(
    fileName: string,
    content: string,
    itos: number[],
    slotInfo: SlotInfo,
    scriptKind: ScriptKind
) {
    const componentIdentifiers: string[] = []
    const slotInfoKeys = Object.keys(slotInfo)
    const config = getConfigByFileName(fileName)
    const isTS = scriptKind === ts.ScriptKind.TS
    const storedTypes = new Map<number, string>()
    const diagnosticsCache: QingKuaiDiagnostic[] = []
    const mappingFileInfo = getMappingFileInfo(fileName)!
    const mappingFileName = mappingFileInfo.mappingFileName
    const notExistingGlobalType = new Set(["Props", "Refs"])
    const qingkuaiModules = resolvedQingkuaiModule.get(mappingFileName)

    // 记录qingkuai自定义诊断信息
    const recordQingkuaiDiagnostic = (
        start: number,
        length: number,
        category: DiagnosticCategory,
        message: ReturnType<typeof getCommonMessage>
    ) => {
        if (isUndefined(itos[start]) || itos[start] === -1) {
            return
        }

        diagnosticsCache.push({
            start,
            length,
            category,
            source: "qk",
            code: message.code,
            messageText: message.msg
        })
    }

    // prettier-ignore
    // 将中间代码的指定范围用空白字符替换（用于需要被移除的语句）
    const eliminateContent = (start: number, length: number) => {
        content = 
            content.slice(0, start) +
            " ".repeat(length) +
            content.slice(start + length)
    }

    // 获取节点文本的长度（不包含结尾的空白字符及分号）
    const getLength = (nodeOrText: Node | string) => {
        if (!isString(nodeOrText)) {
            nodeOrText = nodeOrText.getText()
        }
        return nodeOrText.replace(endingInvalidStr, "").length
    }

    // 更新映射文件信息
    mappingFileInfo.itos = itos
    mappingFileInfo.interCode = content
    mappingFileInfo.slotInfo = slotInfo
    qingkuaiDiagnostics.set(mappingFileName, diagnosticsCache)

    // 将每个待提取类型的索引记录到storedTypes
    slotInfoKeys.forEach(slotName => {
        slotInfo[slotName].properties.forEach(property => {
            if (isNumber(property[2])) {
                storedTypes.set(property[2], "")
            }
        })
    })

    // 将由qingkuai编译器产生的中间代码更新到快照
    editQingKuaiScriptInfo(fileName, content, scriptKind)

    // 获取program、typeCheker以及sourceFile
    const program = languageService.getProgram()!
    const typeChecker = program?.getTypeChecker()!
    const sourceFile = program.getSourceFile(mappingFileName)

    // 分析中间代码AST，记录全局类型标识符的存在状态，类型别名声明和interface声明则
    // 认为当前文件已声明全局类型标识符，对于导入的标识符，需要确定其是否能作为类型使用；
    // 另外此处还处理一些与qingkuai编译器中对于脚本部分类似的检查逻辑（禁用的标识符等），
    // 因为检查模式下qingkuai编译器不会使用@babel/parser解析嵌入脚本代码以提高编译效率
    walk(sourceFile, node => {
        if (
            ts.isBinaryExpression(node) &&
            node.left.getText() === "__c__.Receiver" &&
            !isUndefined(storedTypes.get(node.right.pos)) &&
            node.operatorToken.kind === ts.SyntaxKind.EqualsToken
        ) {
            const type = typeChecker.getTypeAtLocation(node.right)
            const typeStr = typeChecker.typeToString(type)
            storedTypes.set(node.right.pos, typeStr)
        }

        // 脚本类型为js时，检查是否通过JSDoc声明全局类型标识符
        if (!isTS && notExistingGlobalType.size > 0) {
            const typeDefNodes = ts.getJSDocTags(node).filter(jsDocNode => {
                return ts.isJSDocTypedefTag(jsDocNode)
            })
            if (typeDefNodes.length > 0 && isInTopScope(node)) {
                typeDefNodes.forEach(jsDocNode => {
                    if (ts.isJSDocTypedefTag(jsDocNode)) {
                        const identifierName = ts.getNameOfJSDocTypedef(jsDocNode)?.text || ""
                        if (globalTypeIdentifierRE.test(identifierName)) {
                            notExistingGlobalType.delete(identifierName)
                        }
                    }
                })
            }
        }

        // 脚本类型为ts时，检查是否通过类型别名或接口声明全局类型标识符
        if (isTS && (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node))) {
            const identifierName = node.name.getText()
            if (globalTypeIdentifierRE.test(identifierName) && isInTopScope(node)) {
                notExistingGlobalType.delete(identifierName)
            }
        }

        // 脚本类型为ts时，判断有没有通过import语句从其他文件导入全局类型标识符
        // importGlobalIdentifier为一个键为模块导出标识符名称，值为导入标识符名称的映射表，当导入
        // 标识符名称与全局类型标识符名称一致，且其可作为类型标识符使用时，视为该全局类型标识符已被声明
        if (isTS && ts.isImportDeclaration(node) && isInTopScope(node)) {
            const importGlobalTypeIdentifiers = new Map<string, string>()
            if (!isUndefined(node.importClause?.name)) {
                const identifierName = node.importClause.name.text
                if (globalTypeIdentifierRE.test(identifierName)) {
                    importGlobalTypeIdentifiers.set("default", identifierName)
                }
                if (
                    ts.isStringLiteral(node.moduleSpecifier) &&
                    qingkuaiModules?.has(node.moduleSpecifier.text)
                ) {
                    componentIdentifiers.push(identifierName)
                }
            }

            // 对于命名空间导入语法无需处理，因为它并不能为qk文件声明全局类型标识符
            if (
                !isUndefined(node.importClause?.namedBindings) &&
                ts.isNamedImports(node.importClause.namedBindings)
            ) {
                for (const element of node.importClause.namedBindings.elements) {
                    const identifierName = element.name.text
                    if (globalTypeIdentifierRE.test(identifierName)) {
                        importGlobalTypeIdentifiers.set(
                            element.propertyName?.text || identifierName,
                            identifierName
                        )
                    }
                }
            }

            if (importGlobalTypeIdentifiers.size) {
                const moduleSymbol = typeChecker.getSymbolAtLocation(node.moduleSpecifier)
                if (!isUndefined(moduleSymbol)) {
                    typeChecker.getExportsOfModule(moduleSymbol).forEach(symbol => {
                        if (
                            symbol.flags & ts.SymbolFlags.Type &&
                            importGlobalTypeIdentifiers.has(symbol.name)
                        ) {
                            notExistingGlobalType.delete(
                                importGlobalTypeIdentifiers.get(symbol.name)!
                            )
                        }
                    })
                }
            }
        }

        // 检查是否使用了禁止的标识符
        if (ts.isIdentifier(node) && bannedIdentifierFormatRE.test(node.text)) {
            recordQingkuaiDiagnostic(
                node.getStart(),
                getLength(node),
                ts.DiagnosticCategory.Error,
                getCommonMessage("IdentifierFormatIsNotAllowed", node.text)
            )
        }

        // 检查是否使用了export语句
        if (
            ts.isExportAssignment(node) ||
            (node as HasModifiers).modifiers?.some(m => {
                return m.kind === ts.SyntaxKind.ExportKeyword
            })
        ) {
            const [start, length] = [node.getStart(), getLength(node)]
            recordQingkuaiDiagnostic(
                start,
                length,
                ts.DiagnosticCategory.Error,
                getCommonMessage("BadExportRelatedStatement")
            )
            if (ts.isExportAssignment(node)) {
                eliminateContent(start, length)
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
                            getCommonMessage("IdentifierMaybeOverwritten", "$arg")
                        )
                    }
                } else if (existingTopScopeIdentifierRE.test(identifierName)) {
                    // 检查是否重复声明了顶部作用域已存在的标识符（编译致命错误）
                    recordQingkuaiDiagnostic(
                        node.name.getStart(),
                        getLength(node.name),
                        ts.DiagnosticCategory.Error,
                        getCommonMessage("RegisterExsitingIdentifierName", identifierName)
                    )
                }
            }
        }

        if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            compilerFuncs.has(node.expression.text) &&
            isDeclarationOfGlobalType(typeChecker.getSymbolAtLocation(node.expression))
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
                        getCommonMessage("ReactCompilerFuncNotInTopScope")
                    )
                }

                const variableDeclarationNode = findVariableDeclarationOfReactFunc(node)
                if (isNull(variableDeclarationNode)) {
                    // 检查编译器响应性声明相关助手函数是否未在变量定义语句中使用（编译致命错误）
                    recordQingkuaiDiagnostic(
                        ...commonDiagnosticArgs,
                        getCommonMessage("ReactCompilerFuncWithoutVariableDeclaration")
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
                            getCommonMessage("DestructureReactFuncWithNoArg", funcName)
                        )
                    }

                    if (
                        config.convenientDerivedDeclaration &&
                        variableDeclarationNode.name.getText().startsWith("$")
                    ) {
                        if (funcName === "der") {
                            // 检查变量声明中是否混用$前缀和der方法（警告）
                            recordQingkuaiDiagnostic(
                                variableDeclarationNode.getStart(),
                                getLength(variableDeclarationNode),
                                ts.DiagnosticCategory.Warning,
                                getCommonMessage("MixTwoSyntaxOfDerived")
                            )
                        } else {
                            // 检查是否混用$前缀标识符和非der函数（具有二义性）
                            recordQingkuaiDiagnostic(
                                variableDeclarationNode.getStart(),
                                getLength(variableDeclarationNode),
                                ts.DiagnosticCategory.Error,
                                getCommonMessage("ConvenientDerivedWithOtherReactFunc", funcName)
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
                            getCommonMessage("RedundantArgsForCompilerFunc", funcName, 1)
                        )
                    }
                    if (!isTS && funcName === "rea" && node.arguments.length > 2) {
                        recordQingkuaiDiagnostic(
                            node.getStart(),
                            getLength(node),
                            ts.DiagnosticCategory.Warning,
                            getCommonMessage("RedundantArgsForCompilerFunc", funcName, 2)
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
                        getCommonMessage(
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
                        getCommonMessage("RedundantArgsForCompilerFunc", funcName, 2)
                    )
                }
            }
        }
    })

    // notExistingGlobalType中的类型标识符(Props/Refs)默认为never
    const globalTypeDeclaration = Array.from(notExistingGlobalType).reduce(
        (ret, identifierName) => {
            if (isTS) {
                return `${ret}type ${identifierName}=never;`
            } else {
                return `${ret}/** @typedef {never} ${identifierName} */`
            }
        },
        ""
    )
    if (isTS) {
        mappingFileInfo.offset = 0
        content += globalTypeDeclaration
    } else {
        // 由于脚本类型为js时，jsDoc类型声明被放在了前方，所以这里要记录jsDoc类型
        // 声明代码的长度作为源码位置其偏移量，任何获取位置的地方都要减去这个偏移量
        const flbi = content.indexOf("\n") + 1 // First Line Break Index
        mappingFileInfo!.offset = globalTypeDeclaration.length
        content = content.slice(0, flbi) + globalTypeDeclaration + content.slice(flbi)

        // 将已记录的qingkuai自定义诊断项的start增加这个偏移量
        diagnosticsCache.forEach(item => (item.start! += globalTypeDeclaration.length))
    }

    // 根据storedTypes记录的类型组合出当前文件所表示的组件的slot类型
    const slotType = slotInfoKeys.reduce((ret, slotName, i) => {
        const { properties } = slotInfo[slotName]
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
    if (!isTS) {
        content += `export default class{
            /**
             * @param {Props} _
             * @param {Refs} __
             * @param {{${slotType}}} ___
             */
            constructor(_, __, ___){}
        }`
    } else {
        content += `export default class{
            constructor(_: Props, __: Refs, ___: {${slotType}}){}
        }`
    }

    // 将补全了全局类型声明及默认导出语句的内容更新到快照
    return editQingKuaiScriptInfo(fileName, content, scriptKind), componentIdentifiers
}

// 获取commonMessage中的诊断信息
function getCommonMessage<K extends keyof QingKuaiCommonMessage>(
    key: K,
    ...args: Parameters<QingKuaiCommonMessage[K][1]>
) {
    return {
        // @ts-ignore
        msg: commonMessage[key][1](...args),
        code: commonMessage[key][0]
    }
}
