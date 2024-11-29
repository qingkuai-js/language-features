import type { ScriptKind } from "typescript"
import type { SlotInfo } from "qingkuai/compiler"
import type { UpdateSnapshotParams } from "../../../../types/communication"

import { isInTopScope, walk } from "../ast"
import { QingKuaiSnapShot } from "../snapshot"
import { refreshQkFileDiagnostic } from "./diagnostic"
import { getMappingFileInfo, getMappingFileName } from "./document"
import { debounce, stringify } from "../../../../shared-util/sundry"
import { globalTypeIdentifierRE, validIdentifierRE } from "../regular"
import { isNumber, isString, isUndefined } from "../../../../shared-util/assert"
import { ts, languageService, project, projectService, server, snapshotCache } from "../state"

export function updateSnapshot(
    fileName: string,
    content: string,
    slotInfo: SlotInfo,
    scriptKind: ScriptKind
) {
    const slotInfoKeys = Object.keys(slotInfo)
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
    editScriptInfo(fileName, content, scriptKind)

    // 获取program、typeCheker以及sourceFile
    const program = languageService.getProgram()!
    const typeChecker = program?.getTypeChecker()!
    const sourceFile = program.getSourceFile(mappingFileName)

    // 分析中间代码AST，记录全局类型标识符的存在状态，类型别名声明和interface声明可直接认为当前文件已声明全局
    // 类型标识符，对于导入的标识符，需要确定其是否能作为类型使用；另外此处还处理一些与qingkuai编译器中对于脚本
    // 部分类似的检查逻辑（禁止标识符等），检查模式下qingkuai编译器不会使用@babel/parser解析脚本以提高编译效率
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

        if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
            const identifierName = node.name.getText()
            if (globalTypeIdentifierRE.test(identifierName) && isInTopScope(node)) {
                notExistingGlobalType.delete(identifierName)
            }
        }

        // 判断有没有从其他文件导入全局类型标识符，importGlobalIdentifier是一个键为模块导出标识符名称，
        // 值为导入标识符名称的映射表，若导入名称与全局类型名称一致则需要判断导出的标识符符号是否可用作类型
        if (ts.isImportDeclaration(node) && isInTopScope(node)) {
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
    const globalType = Array.from(notExistingGlobalType).reduce((ret, id) => {
        if (scriptKind === ts.ScriptKind.TS) {
            return `${ret}type ${id}=never;`
        } else {
            return `${ret}/**@typedef {never}${id}*/`
        }
    }, "")

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
    const extraStatements = getExtraStatement(globalType, slotType)
    editScriptInfo(fileName, content + extraStatements, scriptKind)
}

export function attachUpdateSnapshot() {
    server.onRequest<UpdateSnapshotParams>("updateSnapshot", params => {
        updateSnapshot(
            params.fileName,
            params.interCode,
            params.slotInfo,
            ts.ScriptKind[params.scriptKindKey]
        )

        // 刷新已打开文件的诊断信息
        refreshDiagnosticsOfOpenFiles(params.fileName)
    })
}

// 刷新一打开文件诊断信息的方法（延时300ms，且有防抖机制）
const refreshDiagnosticsOfOpenFiles = debounce((fileName: string) => {
    project.refreshDiagnostics()
    refreshQkFileDiagnostic(new Set([fileName]))
}, 300)

// 增量更新qk文件ScriptInfo的内容
function editScriptInfo(fileName: string, content: string, scriptKind: ScriptKind) {
    const newSnapshot = new QingKuaiSnapShot(content)
    const mappingFileInfo = getMappingFileInfo(fileName)!
    const mappingFileName = mappingFileInfo.mappingFileName
    const oldSnapshot = snapshotCache.get(mappingFileName)

    let scriptInfo = projectService.getScriptInfo(mappingFileName)
    if (isUndefined(scriptInfo)) {
        scriptInfo = projectService.getOrCreateScriptInfoForNormalizedPath(
            ts.server.toNormalizedPath(mappingFileName),
            true,
            content,
            scriptKind
        )
        scriptInfo?.attachToProject(project)
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

// 获取中间代码中的附加语句：全局类型、默认导出语句
function getExtraStatement(globalType: string, slotType: string) {
    return `${globalType}export default class{constructor(_:Props,__:Refs,___:{${slotType}}){}}`
}
