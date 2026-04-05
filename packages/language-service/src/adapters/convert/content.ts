import type TS from "typescript"

import type { QingkuaiFileInfo } from "../file"
import type { TypescriptAdapter } from "../adapter"
import type { GeneralFunc } from "../../../../../types/util"
import type { ComponentAttributeItem, Pair } from "../../../../../types/common"
import type { ExtractedSlotName, ExtractedSlotContext, GlobalTypeItem } from "../../types/adapter"

import { ts } from "../state"
import { GlobalTypeIsNonObjectJs } from "../../messages/warn"
import { GLOBAL_TYPE_IDS, LSU_AND_DOT } from "../../constants"
import { traverseObject } from "../../../../../shared-util/sundry"
import { isInComponentFunctionTopScope, isInTopScope, walkTsNode } from "../ts-ast"
import { constants as qingkuaiConstants, util as qingkuaiUtil } from "qingkuai/compiler"
import { ExternalGlobalTypeWithGenerics, GlobalTypeIsNonObjectTs } from "../../messages/error"

export function confirmTypesForCompileResult(
    adapter: TypescriptAdapter,
    fileInfo: QingkuaiFileInfo
) {
    let sourceFile!: TS.SourceFile
    let typeChecker!: TS.TypeChecker
    let componentReturnsNode!: TS.ReturnStatement
    let componentFuncNode!: TS.FunctionDeclaration

    const updateSourceFile = () => {
        const program = adapter.getDefaultProgram(fileInfo.path)!
        sourceFile = program?.getSourceFile(fileInfo.path)!
        typeChecker = program?.getTypeChecker()!
        return sourceFile
    }

    if (fileInfo.typesConfirmed || !updateSourceFile()) {
        return
    }
    fileInfo.typesConfirmed = true

    const componentGenerics: string[] = []
    const slotNames: ExtractedSlotName[] = []
    const edit = new FileEdit(fileInfo, updateSourceFile)
    const globalTypes: Record<string, GlobalTypeItem> = {}
    const extractedSlotContexts: ExtractedSlotContext[][] = []
    const anyValueStr = qingkuaiConstants.LSC.UTIL + ".anyValue"
    const getTypeDelayIndexesSet = new Set(fileInfo.getTypeDelayIndexes)

    walkTsNode(sourceFile, node => {
        if (
            ts.isFunctionDeclaration(node) &&
            node.name?.text === qingkuaiConstants.LSC.COMPONENT &&
            isInTopScope(node)
        ) {
            componentFuncNode = node
        }

        if (!fileInfo.isTS) {
            const jsDocs = (node as any).jsDoc as TS.JSDoc[] | undefined
            jsDocs?.forEach(jsDoc => {
                for (const jsDocTag of jsDoc.tags ?? []) {
                    if (
                        ts.isJSDocTypedefTag(jsDocTag) &&
                        jsDocTag.name?.text &&
                        GLOBAL_TYPE_IDS.has(jsDocTag.name.text) &&
                        !globalTypes[jsDocTag.name.text] &&
                        isInComponentFunctionTopScope(jsDocTag)
                    ) {
                        const constraints: string[] = []
                        const genericNames: string[] = []
                        const globalType = typeChecker.getTypeAtLocation(jsDocTag)
                        const templateTags = jsDocTag.parent.tags?.filter(ts.isJSDocTemplateTag)
                        if (!(globalType.flags & ts.TypeFlags.Object)) {
                            fileInfo.pushDiagnostic(
                                jsDocTag.getStart(),
                                jsDocTag.getEnd(),
                                GlobalTypeIsNonObjectJs(jsDocTag.name.text)
                            )
                        }
                        templateTags?.forEach(tag => {
                            tag.typeParameters.forEach((param, index) => {
                                const genericName =
                                    param.name.getText() + jsDocTag.name!.text.slice(0, 1)
                                const constraint =
                                    param.constraint ?? (index === 0 ? tag.constraint : undefined)
                                const constraintText = constraint?.getText() ?? ""
                                if (constraintText) {
                                    constraints.push(constraintText)
                                }
                                genericNames.push(genericName)
                                componentGenerics.push(`@template${constraintText} ${genericName}`)
                            })
                        })
                        globalTypes[jsDocTag.name.text] = {
                            constraints,
                            genericNames,
                            type: globalType,
                            isExternal: false
                        }
                    }
                }
            })
        } else if (
            (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
            GLOBAL_TYPE_IDS.has(node.name.text) &&
            !globalTypes[node.name.text] &&
            isInComponentFunctionTopScope(node)
        ) {
            const constraints: string[] = []
            const genericNames: string[] = []
            const globalType = typeChecker.getTypeAtLocation(node)
            if (!(globalType.flags & ts.TypeFlags.Object)) {
                fileInfo.pushDiagnostic(
                    node.name.getStart(),
                    node.name.getEnd(),
                    GlobalTypeIsNonObjectTs(node.name.text)
                )
            }
            node.typeParameters?.forEach(param => {
                const genericName = param.name.getText() + node.name.text.slice(0, 1)
                if (param.constraint) {
                    constraints.push(param.constraint.getText())
                }
                componentGenerics.push(
                    `${genericName}${param.constraint ? ` extends ${param.constraint.getText()}` : ""}`
                )
                genericNames.push(genericName)
            })
            globalTypes[node.name.text] = {
                genericNames,
                constraints,
                isExternal: false,
                type: typeChecker.getTypeAtLocation(node)
            }
        }

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
                    if (!globalTypes[id.text] && GLOBAL_TYPE_IDS.has(id.text)) {
                        const symbol = typeChecker.getSymbolAtLocation(id)
                        const aliasedSymbol = symbol && typeChecker.getAliasedSymbol(symbol)
                        if (aliasedSymbol && aliasedSymbol.flags & ts.SymbolFlags.Type) {
                            const globalType = typeChecker.getTypeAtLocation(
                                aliasedSymbol.declarations![0]
                            )
                            if (!(globalType.flags & ts.TypeFlags.Object)) {
                                fileInfo.pushDiagnostic(
                                    id.getStart(),
                                    id.getEnd(),
                                    GlobalTypeIsNonObjectTs(id.text)
                                )
                            } else if (
                                (globalType as TS.ObjectType).objectFlags &
                                    ts.ObjectFlags.Reference &&
                                typeChecker.getTypeArguments(globalType as TS.TypeReference).length
                            ) {
                                fileInfo.pushDiagnostic(
                                    id.getStart(),
                                    id.getEnd(),
                                    ExternalGlobalTypeWithGenerics()
                                )
                            }
                            globalTypes[id.text] = {
                                isExternal: true,
                                constraints: [],
                                genericNames: [],
                                type: globalType
                            }
                        }
                    }
                }
            }
        }

        // 提取插槽类型信息
        if (
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            ts.isIdentifier(node.expression.name) &&
            ts.isIdentifier(node.expression.expression) &&
            getTypeDelayIndexesSet.has(node.getStart()) &&
            node.expression.getText() === qingkuaiConstants.LSC.GET_TYPE_DELAY_MARKING
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

        if (ts.isReturnStatement(node) && node.getEnd() === componentFuncNode.getEnd() - 2) {
            componentReturnsNode = node
        }
    })

    // 提取组件的 Props 和 Refs 键值属性
    // 待办：废除目前的 ComponentInfo["attributes"] 结构，改为只需要一个记录拥有 candidates 的属性列表
    // 用于判断是否需要再次触发补全建议，其他情况则直接使用 Typescript 原生能力返回补全建议和悬停提示
    traverseObject(globalTypes, (kind, globalType) => {
        if (
            globalType &&
            (kind === "Props" || kind === "Refs") &&
            globalType.type.flags & ts.TypeFlags.Object
        ) {
            for (const property of typeChecker.getPropertiesOfType(globalType.type)) {
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

    // 全局声明中如果没有 Props 和 Refs 类型，则为其添加一个空对象声明
    ;["Props", "Refs"].forEach(kind => {
        const globalType = globalTypes[kind]
        if (!globalType) {
            edit.setEditIndex(componentFuncNode.getStart())

            if (fileInfo.isTS) {
                edit.push(`type ${kind} = ${qingkuaiConstants.LSC.UTIL}.EmptyObject;\n`)
            } else {
                edit.push(`/** @typedef {${qingkuaiConstants.LSC.UTIL}.EmptyObject} ${kind} */\n`)
            }
        }
    })
    if (fileInfo.isTS && !edit.isEmpty) {
        edit.flush()
    }

    // 为组件函数返回值标注类型
    let contextRefsType = "Refs"
    let declareRefsType = "Refs"
    let contextPropsType = "Props"
    let declarePropsType = "Props"
    if (globalTypes.Refs?.constraints.length) {
        declareRefsType = `Refs<${globalTypes.Refs.constraints.join(", ")}>`
    }
    if (globalTypes.Refs?.genericNames.length) {
        contextRefsType = `Refs<${globalTypes.Refs.genericNames.join(", ")}>`
    }
    if (globalTypes.Props?.constraints.length) {
        declarePropsType = `Props<${globalTypes.Props.constraints.join(", ")}>`
    }
    if (globalTypes.Props?.genericNames.length) {
        contextPropsType = `Props<${globalTypes.Props.genericNames.join(", ")}>`
    }
    if (fileInfo.isTS) {
        edit.setEditIndex(componentFuncNode.body!.getStart() + 2)
        edit.push(`    const props: Readonly<${declarePropsType}> = ${anyValueStr};\n`)
        edit.push(`    const refs: ${declareRefsType} = ${anyValueStr};\n`)
        edit.flush()

        if (componentGenerics.length) {
            edit.setEditIndex(componentReturnsNode.getStart() + 7)
            edit.push(`<${componentGenerics.join(", ")}>`)
            edit.flush()
        }
        edit.setEditIndex(componentReturnsNode.getStart() + 9)
        edit.push(`: { props: ${contextPropsType}; refs: ${contextRefsType}; slots: `)
    } else {
        edit.setEditIndex(componentFuncNode.body!.getStart() + 2)
        edit.push(
            `    /** @type {Readonly<${declarePropsType}>} */ const props = ${anyValueStr};\n`
        )
        edit.push(`    /** @type {${declareRefsType}} */ const refs = ${anyValueStr};\n`)
        edit.flush()
        edit.push("/**\n")

        for (const generic of componentGenerics) {
            edit.push(`     * ${generic}\n`)
        }
        edit.setEditIndex(componentReturnsNode.getStart())
        edit.push(
            `     * @param {Object} context\n     * @param {${contextPropsType}} context.props\n`
        )
        edit.push(`     * @param {${contextRefsType}} context.refs\n     * @param {`)
    }

    if (!slotNames.length) {
        edit.push(`${LSU_AND_DOT}EmptyObject`)
    } else {
        edit.push("{ ")

        for (let i = 0; i < slotNames.length; i++) {
            edit.push(qingkuaiUtil.toPropertyKey(slotNames[i].name), slotNames[i].sourceRange)
            edit.push(": (context: { ")

            for (const { property, valueType } of extractedSlotContexts[i]) {
                edit.push(qingkuaiUtil.toPropertyKey(property.name), property.sourceRange)
                edit.push(`: ${valueType};`)
            }
            edit.push("}) => void;")
        }
        edit.push(" }")
    }
    if (fileInfo.isTS) {
        edit.push("}")
    } else {
        edit.push("} context.slots\n     */\n    ")
    }
    edit.flush()
    updateSourceFile()

    const sourceFileSymbol = typeChecker.getSymbolAtLocation(sourceFile)!
    const defaultExportSymbol = sourceFileSymbol.exports?.get(ts.InternalSymbolName.Default)!
    const defaultExportType = typeChecker.getTypeOfSymbolAtLocation(defaultExportSymbol, sourceFile)
    const defaultExportTypeStr = typeChecker.typeToString(defaultExportType).replaceAll("{", "{\n")
    fileInfo.defaultExportTypeStr = defaultExportTypeStr
}

export class FileEdit {
    private index = -1
    private insertInfo: Record<number, number> = {}

    public items: {
        content: string
        sourceRange?: Pair<number>
    }[] = []

    constructor(
        private fileInfo: QingkuaiFileInfo,
        private updateSourceFile: GeneralFunc
    ) {}

    get isEmpty() {
        return this.items.length === 0
    }

    get editStartIndex() {
        return this.getEditedIndex(this.index)
    }

    setEditIndex(index: number) {
        this.index = index
    }

    getEditedIndex(index: number) {
        let ret = index
        traverseObject(this.insertInfo, (key, value) => {
            if (key < index) {
                ret += value
            }
        })
        return ret
    }

    push(content: string, sourceRange?: Pair<number>) {
        this.items.push({ content, sourceRange })
    }

    flush() {
        let newContent: string
        const startIndex = this.editStartIndex
        const originalContent = this.fileInfo.code
        newContent = originalContent.slice(0, startIndex)

        for (const item of this.items) {
            newContent += item.content
        }
        newContent += this.fileInfo.code.slice(startIndex)
        this.fileInfo.updateContent(newContent)
        this.fileInfo.adjustIndexMap(this)

        for (const item of this.items) {
            this.insertInfo[this.index] ??= 0
            this.insertInfo[this.index] += item.content.length
        }
        this.index = -1
        this.items = []
    }
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
