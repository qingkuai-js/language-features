import type TS from "typescript"

import type {
    GlobalTypes,
    ExtractedSlotName,
    ExtractedSlotContext,
    GlobalTypeDeclarationNode
} from "../../types/adapter"
import type { QingkuaiFileInfo } from "../file"
import type { TypescriptAdapter } from "../adapter"
import type { ComponentAttributeItem, Pair } from "../../../../../types/common"

import { ts } from "../state"
import { LSU_AND_DOT } from "../../constants"
import { isInTopScope, walkTsNode } from "../ts-ast"
import { traverseObject } from "../../../../../shared-util/sundry"
import { constants as qingkuaiConstants, util } from "qingkuai/compiler"

export function confirmTypesForCompileResult(
    adapter: TypescriptAdapter,
    fileInfo: QingkuaiFileInfo
) {
    let sourceFile!: TS.SourceFile
    let typeChecker!: TS.TypeChecker

    const updateSourceFile = (updateContent = true) => {
        if (updateContent) {
            fileInfo.updateContent(contentArr.join(""))
        }

        const program = adapter.getDefaultProgram(fileInfo.path)!
        sourceFile = program?.getSourceFile(fileInfo.path)!
        typeChecker = program?.getTypeChecker()!
        return sourceFile
    }

    if (fileInfo.typesConfirmed || !updateSourceFile(false)) {
        return
    }
    fileInfo.typesConfirmed = true

    const globalTypes: GlobalTypes = {}
    const contentArr = fileInfo.code.split("")
    const slotNames: ExtractedSlotName[] = []
    const extractedSlotContexts: ExtractedSlotContext[][] = []
    const getTypeDelayIndexesSet = new Set(fileInfo.getTypeDelayIndexes)

    const eliminateNode = (node: TS.Node) => {
        const end = node.getEnd()
        for (let i = node.getStart(); i < end; i++) {
            contentArr[i] = " "
        }
    }

    const recordGlobalTypes = (node: GlobalTypeDeclarationNode) => {
        if ((node.name?.text !== "Props" && node.name?.text !== "Refs") || !isInTopScope(node)) {
            return
        }

        const name = node.name.text
        const existing = globalTypes[name]
        if (!existing) {
            globalTypes[name] = { defaultDeclaration: node }
        } else if (
            !globalTypes[name]?.used &&
            existing.defaultDeclaration.getEnd() !== node.getEnd() &&
            existing.defaultDeclaration.getStart() !== node.getStart()
        ) {
            globalTypes[name]!.used = typeChecker.getTypeAtLocation(node)
        }
    }

    const insertExportDefaultStatement = (prefix: string, suffix: string) => {
        insertText(`${prefix}export `)
        insertText("default", fileInfo.exportValueSourceRange)
        insertText(` 0${suffix}`)
    }

    const insertText = (text: string, sourceRange?: Pair<number>) => {
        contentArr.push(...text.split(""))
        fileInfo.adjustIndexMap([contentArr.length - text.length, contentArr.length], sourceRange)
    }

    walkTsNode(sourceFile, node => {
        // 若存在已声明的 Props 或 Refs 类型，则忽略默认值（EmptyObject）
        if (!fileInfo.isTS) {
            for (const jsDocTag of ts.getJSDocTags(node)) {
                ts.isJSDocTypedefTag(jsDocTag) && recordGlobalTypes(jsDocTag)
            }
        } else {
            if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
                recordGlobalTypes(node)
            }
        }

        // 存在导入的 Props 或 Refs 类型时同样需要忽略默认值
        if (ts.isImportDeclaration(node)) {
            if (isInTopScope(node)) {
                const identifiers: TS.Identifier[] = []
                if (ts.isImportDeclaration(node) && node.importClause) {
                    if (node.importClause.name) {
                        identifiers.push(node.importClause.name)
                    }
                    if (
                        node.importClause.namedBindings &&
                        !ts.isNamespaceImport(node.importClause.namedBindings)
                    ) {
                        for (const spec of node.importClause.namedBindings.elements) {
                            identifiers.push(spec.name)
                        }
                    }
                }
                for (const id of identifiers) {
                    if (
                        (id.text === "Props" || id.text === "Refs") &&
                        !globalTypes[id.text]?.used
                    ) {
                        const symbol = typeChecker.getSymbolAtLocation(id)
                        const aliasedSymbol = symbol && typeChecker.getAliasedSymbol(symbol)
                        if (aliasedSymbol && aliasedSymbol.flags & ts.SymbolFlags.Type) {
                            globalTypes[id.text]!.used = typeChecker.getTypeAtLocation(
                                aliasedSymbol.declarations![0]
                            )
                        }
                    }
                }
            }
        }
    })

    // 移除默认的 Props 和 Refs 类型声明，并将采纳的 Props 和 Refs 类型中的键记录到组件属性信息
    traverseObject(globalTypes, (_, info) => {
        if (info?.used) {
            eliminateNode(info.defaultDeclaration)
        }
    })

    // 提取插槽类型信息
    walkTsNode(updateSourceFile(), node => {
        if (
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            ts.isIdentifier(node.expression.name) &&
            ts.isIdentifier(node.expression.expression) &&
            getTypeDelayIndexesSet.has(node.getStart()) &&
            node.expression.getText() === qingkuaiConstants.GET_TYPE_DELAY_MARKING
        ) {
            const slotNameNode = node.arguments[0] as TS.StringLiteral
            const contextPropertyNode = node.arguments[1] as TS.StringLiteral
            if (slotNameNode.text !== slotNames[slotNames.length - 1]?.name) {
                slotNames.push({
                    name: slotNameNode.text,
                    sourceRange: [
                        fileInfo.getSourceIndex(slotNameNode.getStart()),
                        fileInfo.getSourceIndex(slotNameNode.getEnd())
                    ]
                })
                fileInfo.slotNames.push(slotNameNode.text)
            }
            ;(extractedSlotContexts[slotNames.length - 1] ??= []).push({
                property: {
                    name: contextPropertyNode.text,
                    sourceRange: [
                        fileInfo.getSourceIndex(contextPropertyNode.getStart()),
                        fileInfo.getSourceIndex(contextPropertyNode.getEnd())
                    ]
                },
                valueType: typeChecker.typeToString(
                    typeChecker.getTypeAtLocation(node.arguments[2])
                )
            })
        }
    })

    // 提取组件的 Props 和 Refs 键值属性
    traverseObject(globalTypes, (kind, info) => {
        if (info?.used && info.used.flags & ts.TypeFlags.Object) {
            for (const property of typeChecker.getPropertiesOfType(info.used)) {
                const propertyType = typeChecker.getTypeOfSymbolAtLocation(property, sourceFile)
                const attributeItem: ComponentAttributeItem = {
                    kind,
                    name: property.name,
                    stringCandidates: [],
                    type: typeChecker.typeToString(propertyType),
                    optional: !!(property.flags & ts.SymbolFlags.Optional),
                    mayBeEvent: kind === "Props" && isMayBeEventType(propertyType),
                    couldBeString: !!(propertyType.flags & ts.TypeFlags.StringLike)
                }
                if (propertyType.isUnion()) {
                    propertyType.types.forEach(t => {
                        if (t.flags & ts.TypeFlags.StringLiteral) {
                            attributeItem.stringCandidates.push(
                                JSON.parse(typeChecker.typeToString(t))
                            )
                        }
                        attributeItem.couldBeString ||= !!(t.flags & ts.TypeFlags.StringLike)
                    })
                } else if (propertyType.flags & ts.TypeFlags.StringLiteral) {
                    attributeItem.stringCandidates.push(
                        JSON.parse(typeChecker.typeToString(propertyType))
                    )
                }
                if (isEnumerablePropertyOfGlobalTypes(property)) {
                    fileInfo.attributes.push(attributeItem)
                }
            }
        }
    })

    // 添加组件导出
    if (!fileInfo.isTS) {
        insertText(`/** @type `)
    } else {
        insertExportDefaultStatement("", " as any as ")
    }
    insertText(LSU_AND_DOT)

    const defaultExportTypeStartIndex = contentArr.length
    insertText(`QingkuaiComponent<Props, Refs, `)

    if (slotNames.length) {
        insertText("{\n")

        for (let i = 0; i < slotNames.length; i++) {
            insertText(util.toPropertyKey(slotNames[i].name), slotNames[i].sourceRange)
            insertText(": (context: {\n")

            for (const { property, valueType } of extractedSlotContexts[i]) {
                insertText(util.toPropertyKey(property.name), property.sourceRange)
                insertText(`: ${valueType};`)
            }
            insertText("}) => void;")
        }
        insertText("}")
    } else {
        insertText(LSU_AND_DOT + "EmptyObject")
    }
    insertText(">")

    // 记录组件文件的默认导出（export default）值类型
    const fullDefaultExportTypeStr = contentArr.slice(defaultExportTypeStartIndex).join("")
    fileInfo.defaultExportTypeStr = fullDefaultExportTypeStr.replace(LSU_AND_DOT, "")

    if (!fileInfo.isTS) {
        insertExportDefaultStatement(" */ ", "")
    }
    ;(insertText(";"), updateSourceFile())
}

function isMayBeEventType(type: TS.Type): boolean {
    if (type.isClass()) {
        return false
    }
    if (type.isUnion()) {
        return type.types.some(item => isMayBeEventType(item))
    }
    return !!(type.getCallSignatures().length || type.symbol?.name === "Function")
}

function isEnumerablePropertyOfGlobalTypes(symbol: TS.Symbol) {
    if (symbol.declarations?.length !== 1) {
        return false
    }

    const declaration = symbol.declarations[0]
    if (!("name" in declaration)) {
        return false
    }
    switch ((declaration.name as any).kind) {
        case ts.SyntaxKind.Identifier:
        case ts.SyntaxKind.StringLiteral:
        case ts.SyntaxKind.NumericLiteral: {
            return true
        }
        default: {
            return false
        }
    }
}
