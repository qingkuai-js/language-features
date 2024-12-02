import type { ScriptKind } from "typescript"
import type { SlotInfo } from "qingkuai/compiler"
import type { UpdateSnapshotParams } from "../../../../types/communication"

import { isInTopScope, walk } from "../ast"
import { QingKuaiSnapShot } from "../snapshot"
import { refreshDiagnostics } from "./diagnostic"
import { stringify } from "../../../../shared-util/sundry"
import { getMappingFileInfo, getMappingFileName } from "./document"
import { globalTypeIdentifierRE, validIdentifierRE } from "../regular"
import { isNumber, isString, isUndefined } from "../../../../shared-util/assert"
import { ts, languageService, project, projectService, server, snapshotCache } from "../state"

export function updateQingkuaiSnapshot(
    fileName: string,
    content: string,
    slotInfo: SlotInfo,
    scriptKind: ScriptKind
) {
    const slotInfoKeys = Object.keys(slotInfo)
    const isTS = scriptKind === ts.ScriptKind.TS
    const storedTypes = new Map<number, string>()
    const mappingFileName = getMappingFileName(fileName)!
    const notExistingGlobalType = new Set(["Props", "Refs"])

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
                const moduleSymbol = typeChecker.getSymbolAtLocation(node.moduleSpecifier)!
                typeChecker.getExportsOfModule(moduleSymbol).forEach(symbol => {
                    if (
                        symbol.flags & ts.SymbolFlags.Type &&
                        importGlobalTypeIdentifiers.has(symbol.name)
                    ) {
                        notExistingGlobalType.delete(importGlobalTypeIdentifiers.get(symbol.name)!)
                    }
                })
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
        content += globalTypeDeclaration
    } else {
        // 由于脚本类型为js时，jsDoc类型声明被放在了前方，所以这里要记录jsDoc类型
        // 声明代码的长度作为源码位置其偏移量，任何获取位置的地方都要减去这个偏移量
        const flbi = content.indexOf("\n") + 1 // First Line Break Index
        getMappingFileInfo(fileName)!.offset = globalTypeDeclaration.length
        content = content.slice(0, flbi) + globalTypeDeclaration + content.slice(flbi)
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
    editQingKuaiScriptInfo(fileName, content, scriptKind)
}

export function attachUpdateSnapshot() {
    server.onRequest<UpdateSnapshotParams>("updateSnapshot", ({ fileName, ...rest }) => {
        const scriptKind = ts.ScriptKind[rest.scriptKindKey]
        const oriScriptKind = getMappingFileInfo(fileName)?.scriptKind
        updateQingkuaiSnapshot(fileName, rest.interCode, rest.slotInfo, scriptKind)
        refreshDiagnostics(fileName, !isUndefined(oriScriptKind) && scriptKind !== oriScriptKind)
    })
}

// 增量更新qk文件ScriptInfo的内容
export function editQingKuaiScriptInfo(fileName: string, content: string, scriptKind: ScriptKind) {
    const program = languageService.getProgram()
    const newSnapshot = new QingKuaiSnapShot(content)
    const mappingFileInfo = getMappingFileInfo(fileName)!
    const mappingFileName = mappingFileInfo.mappingFileName
    const oldSnapshot = snapshotCache.get(mappingFileName)
    const scriptInfo = projectService.getScriptInfo(mappingFileName)

    if (isUndefined(scriptInfo) || isUndefined(oldSnapshot)) {
        const info = projectService.getOrCreateScriptInfoForNormalizedPath(
            ts.server.toNormalizedPath(mappingFileName),
            true,
            content,
            scriptKind
        )
        if (!isUndefined(info)) {
            info.attachToProject(project)
            if (isUndefined(program?.getSourceFile(mappingFileName))) {
                info.markContainingProjectsAsDirty()
                project.updateGraph()
            }
        }
    } else if (!isUndefined(oldSnapshot)) {
        const change = newSnapshot.getChangeRange(oldSnapshot)
        const changeStart = change.span.start
        scriptInfo.editContent(
            changeStart,
            changeStart + change.span.length,
            newSnapshot.getText(changeStart, changeStart + change.newLength)
        )
    }

    mappingFileInfo.version++
    mappingFileInfo.scriptKind = scriptKind
    snapshotCache.set(mappingFileName, newSnapshot ?? oldSnapshot)
}
