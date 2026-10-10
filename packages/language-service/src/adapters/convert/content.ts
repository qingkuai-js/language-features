import type TS from "typescript"

import type {
    MetaType,
    FileEditItem,
    ExtractedSlotName,
    ExtractedSlotContext
} from "../../types/adapter"
import type { QingkuaiFileInfo } from "../file"
import type { TypescriptAdapter } from "../adapter"
import type { Getter, Setter } from "../../../../../types/util"
import type { ComponentAttributeItem, Pair } from "../../../../../types/common"

import {
    UnknownMetaMember,
    BadExternalMetaType,
    TypeExportNotAllowed,
    MetaOrMemberNonObjectTs
} from "../../messages/error"
import { setState, ts as stateTs } from "../state"
import { isInTopScope, walkTsNode } from "../ts-ast"
import { MetaOrMemberNonObjectJs } from "../../messages/warn"
import { isUndefined } from "../../../../../shared-util/assert"
import { traverseObject } from "../../../../../shared-util/sundry"
import { META_TYPE_ID, META_MEMBER_IDS, LSU_AND_DOT } from "../../constants"
import { constants as qingkuaiConstants, util as qingkuaiUtil } from "qingkuai/compiler"

export function confirmTypesForCompileResultWithAdapter(
    adapter: TypescriptAdapter,
    fileInfo: QingkuaiFileInfo
) {
    return confirmTypesForCompileResult(
        adapter.ts,
        fileInfo,
        newContent => {
            adapter.updateContent(fileInfo, newContent)
        },
        () => {
            return adapter.getDefaultProgram(fileInfo.path)
        }
    )
}

export function confirmTypesForCompileResult(
    ts: typeof TS,
    fileInfo: QingkuaiFileInfo,
    updateContent: Setter<string>,
    getTsProgram: Getter<TS.Program | undefined>
) {
    let program: TS.Program | undefined

    let sourceFile!: TS.SourceFile
    let typeChecker!: TS.TypeChecker
    let componentFuncNode!: TS.VariableDeclaration

    const updateSourceFile = () => {
        program = getTsProgram()
        sourceFile = program?.getSourceFile(fileInfo.path)!
        typeChecker = program?.getTypeChecker()!
        return sourceFile
    }

    if (isUndefined(stateTs)) {
        setState({ ts })
    }

    if (fileInfo.typesConfirmed || !updateSourceFile()) {
        return
    }

    let metaGenericText = ""
    let metaTypeParametersText = ""
    let templateTags: string[] = []
    let posOfSecondLineStart: number
    let metaType: MetaType | undefined

    try {
        posOfSecondLineStart = ts.getPositionOfLineAndCharacter(sourceFile, 1, 0)
    } catch {
        return
    }
    fileInfo.typesConfirmed = true

    const slotNames: ExtractedSlotName[] = []
    const extractedSlotContexts: ExtractedSlotContext[][] = []
    const [LSC, LSU] = [qingkuaiConstants.LSC, qingkuaiConstants.LSC.UTIL]

    const anyValueStr = LSU + ".anyValue"
    const metaInstanceId = "__qk__metaInstance"
    const emptyObjectStr = `${LSU}.EmptyObject`
    const intrinsics = Array.from(META_MEMBER_IDS)
    const edit = new FileEdit(fileInfo, updateContent)
    const getTypeDelayIndexesSet = new Set(fileInfo.getTypeDelayIndexes)

    walkTsNode(sourceFile, node => {
        if (
            ts.isVariableDeclaration(node) &&
            node.initializer &&
            ts.isArrowFunction(node.initializer) &&
            node.name.getText() === LSC.COMPONENT &&
            isInTopScope(node)
        ) {
            componentFuncNode = node
        }

        if (!fileInfo.isTS) {
            ;((node as any).jsDoc as TS.JSDoc[] | undefined)?.forEach(jsDoc => {
                for (const jsDocTag of jsDoc.tags ?? []) {
                    if (
                        metaType ||
                        !ts.isJSDocTypedefTag(jsDocTag) ||
                        jsDocTag.name?.text !== META_TYPE_ID ||
                        !isInTopScope(jsDocTag)
                    ) {
                        continue
                    }
                    metaType = {
                        type: typeChecker.getTypeAtLocation(jsDocTag),
                        end: fileInfo.getSourceIndex(jsDocTag.name.getEnd()),
                        start: fileInfo.getSourceIndex(jsDocTag.name.getStart())
                    }
                    jsDocTag.parent.tags?.filter(ts.isJSDocTemplateTag)?.forEach(tag => {
                        tag.typeParameters.forEach(param => {
                            let templateTag = ` * @template `
                            const genericName = param.name.text
                            const constraintText = tag.constraint?.type.getText()
                            if (metaGenericText) {
                                metaGenericText += ", "
                            }
                            if (metaTypeParametersText) {
                                metaTypeParametersText += ", "
                            }
                            if (((metaTypeParametersText += genericName), constraintText)) {
                                templateTag += `{${constraintText}} `
                                metaTypeParametersText += ` extends ${constraintText}`
                            }
                            metaGenericText += `${genericName}`
                            templateTags.push(templateTag + genericName)
                        })
                    })
                }
            })
        } else if (
            (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
            node.name.text === META_TYPE_ID &&
            !metaType &&
            isInTopScope(node)
        ) {
            if (node.typeParameters) {
                metaTypeParametersText = sourceFile.text.slice(
                    node.typeParameters.pos,
                    node.typeParameters.end
                )
            }
            node.typeParameters?.forEach(param => {
                if (metaGenericText) {
                    metaGenericText += ", "
                }
                metaGenericText += param.name.text
            })
            metaType = {
                type: typeChecker.getTypeAtLocation(node),
                end: fileInfo.getSourceIndex(node.name.getEnd()),
                start: fileInfo.getSourceIndex(node.name.getStart())
            }
        }

        if (!metaType && ts.isImportDeclaration(node) && isInTopScope(node)) {
            const identifiers: TS.Identifier[] = []
            if (node.importClause) {
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
                if (id.text !== META_TYPE_ID || metaType) {
                    continue
                }

                const symbol = typeChecker.getSymbolAtLocation(id)
                const aliasedSymbol = symbol && typeChecker.getAliasedSymbol(symbol)
                if (!aliasedSymbol || !(aliasedSymbol.flags & ts.SymbolFlags.Type)) {
                    continue
                }

                const aliasedDecl = aliasedSymbol.declarations?.[0]
                if (
                    !aliasedDecl ||
                    !(
                        ts.isTypeAliasDeclaration(aliasedDecl) ||
                        ts.isInterfaceDeclaration(aliasedDecl)
                    )
                ) {
                    continue
                }
                if (aliasedDecl.typeParameters?.length) {
                    fileInfo.pushDiagnostic(
                        fileInfo.getSourceIndex(id.getStart()),
                        fileInfo.getSourceIndex(id.getEnd()),
                        BadExternalMetaType(id.text),
                        true
                    )
                    continue
                }
                metaType = {
                    end: fileInfo.getSourceIndex(id.getEnd()),
                    start: fileInfo.getSourceIndex(id.getStart()),
                    type: typeChecker.getTypeAtLocation(aliasedDecl)
                }
                break
            }
        }

        // 组件导出规则：嵌入脚本不允许导出类型（类型/契约放外部 .ts），3005。
        // export 声明必为 sourceFile 直接子节点；需判 node.parent 存在（sourceFile 自身 parent 为 undefined）。
        if (node.parent && ts.isSourceFile(node.parent)) {
            if (ts.isExportDeclaration(node) && node.exportClause) {
                if (ts.isNamespaceExport(node.exportClause)) {
                    return
                }
                for (const element of node.exportClause.elements) {
                    if (element.isTypeOnly) {
                        fileInfo.pushDiagnostic(
                            element.getStart(),
                            element.getEnd(),
                            TypeExportNotAllowed(element.name.text)
                        )
                        continue
                    }
                    const exportSymbol = typeChecker.getSymbolAtLocation(element.name)
                    const aliasedExport = exportSymbol && typeChecker.getAliasedSymbol(exportSymbol)
                    if (aliasedExport && !(aliasedExport.flags & ts.SymbolFlags.Value)) {
                        fileInfo.pushDiagnostic(
                            element.getStart(),
                            element.getEnd(),
                            TypeExportNotAllowed(element.name.text)
                        )
                    }
                }
            } else if (
                ts.canHaveModifiers(node) &&
                node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) &&
                (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node))
            ) {
                fileInfo.pushDiagnostic(
                    node.name.getStart(),
                    node.name.getEnd(),
                    TypeExportNotAllowed(node.name.text)
                )
            }
        }

        // 提取插槽类型信息
        if (
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            ts.isIdentifier(node.expression.name) &&
            ts.isIdentifier(node.expression.expression) &&
            getTypeDelayIndexesSet.has(node.getStart()) &&
            node.expression.getText() === LSC.GET_TYPE_DELAY_MARKING
        ) {
            const slotNameNode = node.arguments[0] as TS.StringLiteral
            const contextPropertyNode = node.arguments[1] as TS.StringLiteral

            // 源位置可能落在虚拟文件的未映射区间（itos 为 -1），
            // 任一端点为 -1 时去除 sourceRange，避免负索引污染映射
            //
            // Source positions may fall in unmapped virtual-file regions
            // (itos is -1); drop the sourceRange when either endpoint is -1
            // to prevent negative-index pollution of the mapping
            const toSourceRange = (node: TS.Node): [number, number] | undefined => {
                const start = fileInfo.getSourceIndex(node.getStart())
                const end = fileInfo.getSourceIndex(node.getEnd())
                return start === -1 || end === -1 ? undefined : [start, end]
            }

            if (slotNameNode.text !== slotNames[slotNames.length - 1]?.name) {
                slotNames.push({
                    name: slotNameNode.text,
                    sourceRange: toSourceRange(slotNameNode)
                })
                fileInfo.slotNames.push(slotNameNode.text)
            }
            ;(extractedSlotContexts[slotNames.length - 1] ??= []).push({
                property: {
                    name: contextPropertyNode.text,
                    sourceRange: toSourceRange(contextPropertyNode)
                },
                valueType: typeChecker.typeToString(
                    typeChecker.getTypeAtLocation(node.arguments[2])
                )
            })
        }
    })

    // 检查 Meta 及其成员类型是否符合约束
    if (metaType) {
        const NonObject = fileInfo.isTS ? MetaOrMemberNonObjectTs : MetaOrMemberNonObjectJs
        if (!(metaType.type.flags & ts.TypeFlags.Object)) {
            fileInfo.pushDiagnostic(metaType.start, metaType.end, NonObject(), true)
        }
        for (const property of typeChecker.getPropertiesOfType(metaType.type)) {
            const propStart = property.declarations?.[0]
                ? ((property.declarations[0] as any).name?.getStart?.() ??
                  property.declarations[0].getStart())
                : metaType.start
            const propEnd = property.declarations?.[0]
                ? ((property.declarations[0] as any).name?.getEnd?.() ??
                  property.declarations[0].getEnd())
                : metaType.end
            if (!META_MEMBER_IDS.has(property.name)) {
                fileInfo.pushDiagnostic(propStart, propEnd, UnknownMetaMember(property.name), true)
                continue
            }

            const propertyType = typeChecker.getTypeOfSymbolAtLocation(property, sourceFile)
            if (!isObjectLikeMemberType(ts, propertyType)) {
                fileInfo.pushDiagnostic(propStart, propEnd, NonObject(property.name), true)
            }
        }
    }

    // 提取组件的 props / refs 属性并记录到 fileInfo.attributes
    if (metaType && metaType.type.flags & ts.TypeFlags.Object) {
        for (const [kind, member] of [
            ["Props", "props"],
            ["Refs", "refs"]
        ] as const) {
            const memberSymbol = typeChecker.getPropertyOfType(metaType.type, member)
            if (!memberSymbol) {
                continue
            }

            const memberType = typeChecker.getTypeOfSymbolAtLocation(memberSymbol, sourceFile)
            if (!(memberType.flags & ts.TypeFlags.Object)) {
                continue
            }

            for (const property of typeChecker.getPropertiesOfType(memberType)) {
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
                if (isEnumerablePropertyOfGlobalTypes(ts, property)) {
                    fileInfo.attributes.push(attributeItem)
                }
            }
        }
    }

    const getIntrinsicType = (member: string, inArg?: boolean) => {
        if (!metaType) {
            return emptyObjectStr
        }

        const memberSymbol = typeChecker.getPropertyOfType(metaType.type, member)
        if (!memberSymbol) {
            return emptyObjectStr
        }
        if (inArg) {
            return `Meta${metaGenericText ? `<${metaGenericText}>` : ""}["${member}"]`
        }

        const inner = `typeof ${metaInstanceId}["${member}"]`
        return `${LSU}.Prettify<${member === "refs" ? inner : `Readonly<${inner}>`}>`
    }

    const getIntrinsicDeclrations = () => {
        let wrapMetaFuncType = "() => Meta"
        const partsOfResult: string[] = []
        if (metaTypeParametersText && metaGenericText) {
            wrapMetaFuncType = `<${metaTypeParametersText}>(meta: Meta<${metaGenericText}>) => typeof meta`
        }

        if (fileInfo.isTS) {
            partsOfResult.push(
                `const ${metaInstanceId} = (${anyValueStr} as (${wrapMetaFuncType}))();`
            )
            for (const item of intrinsics) {
                partsOfResult.push(`const ${item}: ${getIntrinsicType(item)} = ${anyValueStr};`)
            }
        } else {
            partsOfResult.push(
                `const ${metaInstanceId} = (/** @type ${wrapMetaFuncType} */() => {})();`
            )
            for (const item of intrinsics) {
                partsOfResult.push(
                    `/** @type {${getIntrinsicType(item)}} */\nconst ${item} = ${anyValueStr};`
                )
            }
        }
        return partsOfResult.join("\n")
    }

    // 未能识别出组件函数时（文件本就不含组件函数，或编译出的中间代码结构与预期不符）
    // 没有可注入类型的组件函数节点，必须在此提前返回：其后代码会直接访问
    // componentFuncNode.initializer / .parent，空引用抛出的异常会沿 IPC 请求冒泡——
    // 同步处理器中会变成 ts 服务器的未捕获异常，异步处理器中会让对端请求永久挂起。
    // 注意此时不能先执行任何 edit.flush()，否则中间代码会被改到一半后中断
    if (isUndefined(componentFuncNode)) {
        return
    }

    if (fileInfo.isTS) {
        edit.setEditIndex(posOfSecondLineStart)
        edit.push(getIntrinsicDeclrations())
        edit.flush()

        if (metaTypeParametersText) {
            edit.setEditIndex(componentFuncNode.initializer!.getStart())
            edit.push(metaTypeParametersText)
            edit.flush()
        }
        if (metaTypeParametersText) {
            edit.setEditIndex(componentFuncNode.initializer!.getStart())
            edit.push(`<${metaTypeParametersText}>`)
            edit.flush()
        }

        edit.setEditIndex(componentFuncNode.initializer!.getStart() + 5)
        edit.push(
            intrinsics.reduce((ret, cur, index) => {
                const isLast = index === intrinsics.length - 1
                return `${ret}${cur}: ${getIntrinsicType(cur, true)}; ${isLast ? "slots: " : ""}`
            }, ": { ")
        )
    } else {
        edit.setEditIndex(0)
        edit.push(getIntrinsicDeclrations())
        edit.flush()
        edit.setEditIndex(componentFuncNode.parent.getStart())
        edit.push("/**\n" + templateTags.join("\n") + "\n")
        edit.push(
            intrinsics.reduce((ret, cur, index) => {
                const postfix = index === intrinsics.length - 1 ? " * @param {" : ""
                return `${ret} * @param {${getIntrinsicType(cur, true)}} meta.${cur}\n${postfix}`
            }, " * @param {Object} meta\n")
        )
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
        edit.push("} meta.slots\n */\n")
    }
    edit.flush()
    updateSourceFile()

    const sourceFileSymbol = typeChecker.getSymbolAtLocation(sourceFile)!
    const defaultExportSymbol = sourceFileSymbol.exports?.get(ts.InternalSymbolName.Default)
    if (defaultExportSymbol) {
        const defaultExportType = typeChecker.getTypeOfSymbolAtLocation(
            defaultExportSymbol,
            sourceFile
        )
        const typeStr = typeChecker.typeToString(
            defaultExportType,
            sourceFile,
            ts.TypeFormatFlags.NoTruncation
        )
        fileInfo.defaultExportTypeStr = typeStr.replaceAll(LSU_AND_DOT, "")
    }
}

export class FileEdit {
    private index = -1
    private insertInfo: Record<number, number> = {}

    public items: FileEditItem[] = []

    constructor(
        private fileInfo: QingkuaiFileInfo,
        private updateContent: Setter<string>
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
        if (!this.items.length) {
            return
        }

        let newContent: string
        const startIndex = this.editStartIndex
        const originalContent = this.fileInfo.code
        newContent = originalContent.slice(0, startIndex)

        for (const item of this.items) {
            newContent += item.content
        }
        newContent += this.fileInfo.code.slice(startIndex)
        this.updateContent(newContent)
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

function isEnumerablePropertyOfGlobalTypes(ts: typeof TS, symbol: TS.Symbol) {
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

// 成员类型是否可视为对象类型：对象，或“对象 | undefined”这类可选成员联合。
function isObjectLikeMemberType(ts: typeof TS, type: TS.Type): boolean {
    if (type.flags & ts.TypeFlags.Object) {
        return true
    }
    if (type.isUnion()) {
        return type.types.every(part => {
            return part.flags & (ts.TypeFlags.Object | ts.TypeFlags.Undefined)
        })
    }
    return false
}
