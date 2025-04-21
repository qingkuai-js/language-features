import type TS from "typescript"

import {
    ts,
    path,
    getConfig,
    getCompileInfo,
    getFullFileNames,
    resolvedQingkuaiModule
} from "../state"
import { getRealPath } from "../qingkuai"
import { globalTypeIdentifierRE } from "../../regular"
import { isEventType, isInTopScope, isSymbolKey, walk } from "../ts-ast"
import { GlobalTypeIdentifier } from "../../../../../shared-util/constant"
import { filePathToComponentName } from "../../../../../shared-util/qingkuai"
import { ComponentAttributeItem, ComponentIdentifierInfo } from "../../../../../types/common"
import { debugAssert, isQingkuaiFileName, isUndefined } from "../../../../../shared-util/assert"

export function getComponentInfos(languageService: TS.LanguageService, fileName: string) {
    const dirPath = path.dir(fileName)
    const realPath = getRealPath(fileName)
    const config = getConfig(realPath)
    const program = languageService.getProgram()!
    const sourceFile = program.getSourceFile(fileName)!
    const qingkuaiModules = resolvedQingkuaiModule.get(realPath)
    debugAssert(!!sourceFile)

    const importedQingkuaiFileNames = new Set<string>()
    const componentInfos: ComponentIdentifierInfo[] = []
    walk(sourceFile, node => {
        if (ts.isImportDeclaration(node) && isInTopScope(node)) {
            if (!isUndefined(node.importClause?.name)) {
                const identifierName = node.importClause.name.text
                if (
                    ts.isStringLiteral(node.moduleSpecifier) &&
                    qingkuaiModules?.has(node.moduleSpecifier.text)
                ) {
                    let componentFileName = path.resolve(dirPath, node.moduleSpecifier.text)
                    if (!isQingkuaiFileName(componentFileName)) {
                        componentFileName += ".qk"
                    }
                    componentInfos.push({
                        imported: true,
                        name: identifierName,
                        relativePath: node.moduleSpecifier.text,
                        slotNams: getComponentSlotNames(componentFileName),
                        attributes: getCompileInfo(componentFileName).attributeInfos
                    })
                    importedQingkuaiFileNames.add(componentFileName)
                }
            }
        }
    })
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
            componentInfos.push({
                imported: false,
                attributes: [],
                relativePath: relativePath,
                slotNams: getComponentSlotNames(currentFileName),
                name: filePathToComponentName(path, currentFileName)
            })
        }
    }
    return componentInfos
}

// 获取组件的attribute信息
export function getComponentAttributes(languageService: TS.LanguageService, fileName: string) {
    const program = languageService.getProgram()!
    const typeChecker = program.getTypeChecker()
    const attributes: ComponentAttributeItem[] = []
    const sourceFile = program.getSourceFile(fileName)!
    debugAssert(!!sourceFile)

    // @ts-expect-error: access private property
    sourceFile.locals?.forEach((symbol, name) => {
        if (globalTypeIdentifierRE.test(name)) {
            let type: TS.Type
            if (!ts.isJSDocTypedefTag(symbol.declarations[0])) {
                type = typeChecker.getDeclaredTypeOfSymbol(symbol)
            } else {
                type = typeChecker.getTypeFromTypeNode(symbol.declarations[0].typeExpression as any)
            }

            if (!type.symbol || !(type.symbol.flags & ts.SymbolFlags.Type)) {
                return
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

                if (!isSymbolKey(property)) {
                    attributes.push({
                        stringCandidates,
                        name: property.name,
                        kind: name.slice(0, -1),
                        type: typeChecker.typeToString(propertyType),
                        isEvent: name === GlobalTypeIdentifier.Prop && isEventType(propertyType)
                    })
                }
            })
        }
    })
    return attributes
}

function getRelativePathWithStartDot(from: string, to: string) {
    const relativePath = path.relative(from, to)
    return /\.{1,2}\//.test(relativePath) ? relativePath : `./${relativePath}`
}

function getComponentSlotNames(componentFileName: string) {
    return Object.keys(getCompileInfo(getRealPath(componentFileName)).slotInfo)
}
