import type {
    GetConfigurationParams,
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../types/communication"
import type { NavigationTree } from "typescript"
import type { CodeLens, Location } from "vscode-languageserver"
import type { CodeLensHandler, ResolveCodeLensHandler } from "../types/handlers"
import type { CachedCompileResultItem, CodeLensConfig, CodeLensData } from "../types/service"

import { findSlotReferences } from "./reference"
import { getCompileRes, walk } from "../compile"
import { connection, documents, tpic } from "../state"
import { escapeRegExp } from "../../../../shared-util/sundry"
import { ShowReferencesCommandParams } from "../../../../types/command"
import { EXPORT_DEFAULT_OFFSET, LSHandler, TPICHandler } from "../../../../shared-util/constant"
import { filePathToComponentName, isSourceIndexesInvalid } from "../../../../shared-util/qingkuai"

export const codeLens: CodeLensHandler = async ({ textDocument }) => {
    const document = documents.get(textDocument.uri)
    if (!document) {
        return null
    }

    const cr = await getCompileRes(document)
    const e29x = cr.interIndexMap.itos.length + EXPORT_DEFAULT_OFFSET
    const navtree = await tpic.sendRequest<string, NavigationTree | undefined>(
        TPICHandler.getNavigationTree,
        cr.filePath
    )
    if (!navtree?.childItems) {
        return null
    }

    const codeLenses: CodeLens[] = []
    const codeLensConfig: CodeLensConfig = await connection.sendRequest(LSHandler.getClientConfig, {
        uri: textDocument.uri,
        section: cr.scriptLanguageId,
        filter: ["referencesCodeLens", "implementationsCodeLens"]
    } satisfies GetConfigurationParams)

    if (
        !codeLensConfig.referencesCodeLens.enabled &&
        !codeLensConfig.implementationsCodeLens?.enabled
    ) {
        return null
    }

    walkNavigationTree(navtree.childItems, undefined, (item, parent) => {
        const types = getCodeLensTypesForNavigationTree(codeLensConfig, item, parent)
        if (types.length) {
            const range = getRangeOfNavigationTree(item, cr)
            if (range) {
                types.forEach(type => {
                    codeLenses.push({
                        range,
                        data: {
                            type,
                            fileName: cr.filePath,
                            position: range.start,
                            interIndex: cr.getInterIndex(document.offsetAt(range.start))
                        } satisfies CodeLensData
                    })
                })
            }
        }
    })

    // 在嵌入script标签和slot标签处添加代码镜头（引用）
    walk(cr.templateNodes, node => {
        const tagNameEndIndex = node.range[0] + node.tag.length + 1
        if (node.isEmbedded && /[jt]s$/.test(node.tag)) {
            codeLenses.push({
                range: cr.getRange(node.range[0], tagNameEndIndex),
                data: {
                    interIndex: e29x,
                    type: "reference",
                    fileName: cr.filePath,
                    position: cr.getPosition(node.range[0])
                } satisfies CodeLensData
            })
        } else if (node.tag === "slot") {
            const nameAttribute = node.attributes.find(attr => {
                return attr.key.raw === "name"
            })
            if (nameAttribute) {
                codeLenses.push({
                    range: cr.getRange(node.range[0], tagNameEndIndex),
                    data: {
                        interIndex: e29x,
                        type: "reference",
                        fileName: cr.filePath,
                        slotName: nameAttribute.value.raw,
                        componentName: filePathToComponentName(cr.filePath),
                        position: cr.getPosition(nameAttribute.key.loc.start.index)
                    } satisfies CodeLensData
                })
            }
        }
    })

    return codeLenses
}

export const resolveCodeLens: ResolveCodeLensHandler = async codeLens => {
    const locations: Location[] = []
    const data: CodeLensData = codeLens.data
    const { type, fileName, interIndex, position } = data
    const label = data.componentName ? "useage" : type
    const handlerName = "find" + type[0].toUpperCase() + type.slice(1)

    let findResult: FindReferenceResultItem[] | [] =
        await tpic.sendRequest<TPICCommonRequestParams>(handlerName, {
            fileName,
            pos: interIndex
        })

    // 过滤实现中与现实codeLens开始位置形同的项目
    if (findResult && type === "implementation") {
        findResult = findResult.filter(item => {
            return (
                item.fileName !== fileName ||
                item.range.start.line !== position.line ||
                item.range.start.character !== position.character
            )
        })
    }

    if (findResult?.length) {
        if (!data.componentName) {
            findResult.forEach(item => {
                locations.push({
                    range: item.range,
                    uri: `file://${item.fileName}`
                })
            })
        } else {
            const useages = await findSlotReferences(findResult, data.slotName!, data.componentName)
            useages?.length && locations.push(...useages)
        }
    }
    return {
        ...codeLens,
        command: {
            command: locations.length ? "qingkuai.showReferences" : "",
            title: `${locations.length} ${label}${locations.length === 1 ? "" : "s"}`,
            arguments: [{ fileName, locations, position } satisfies ShowReferencesCommandParams]
        }
    }
}

function walkNavigationTree(
    items: NavigationTree[],
    parent: NavigationTree | undefined,
    cb: (item: NavigationTree, parent: NavigationTree | undefined) => void
) {
    items.forEach(item => {
        cb(item, parent)
        if (item.childItems?.length) {
            walkNavigationTree(item.childItems, item, cb)
        }
    })
}

function getCodeLensTypesForNavigationTree(
    config: CodeLensConfig,
    item: NavigationTree,
    parent: NavigationTree | undefined
) {
    const types: ("implementation" | "reference")[] = []

    if (parent) {
        if ("enum" === parent.kind && config.referencesCodeLens.enabled) {
            types.push("reference")
        }
        if (
            "method" === item.kind &&
            "interface" === parent.kind &&
            config.implementationsCodeLens?.enabled &&
            config.implementationsCodeLens?.showOnInterfaceMethods
        ) {
            types.push("implementation")
        }
    }

    if (config.implementationsCodeLens?.enabled && !types.includes("implementation")) {
        switch (item.kind) {
            case "interface":
                types.push("implementation")
                break

            case "class":
            case "method":
            case "getter":
            case "setter":
            case "property":
                if (item.kindModifiers.match(/\babstract\b/g)) {
                    types.push("implementation")
                }
                break
        }
    }

    if (config.referencesCodeLens.enabled && !types.includes("reference")) {
        switch (item.kind) {
            case "function": {
                if (config.referencesCodeLens.showOnAllFunctions && item.nameSpan) {
                    types.push("reference")
                }
                break
            }

            case "var":
            case "let":
            case "const":
                if (/\bexport\b/.test(item.kindModifiers)) {
                    types.push("reference")
                }
                break

            case "class":
                if (item.text !== "<class>") {
                    types.push("reference")
                }
                break

            case "type":
            case "enum":
            case "interface":
                types.push("reference")
                break

            case "method":
            case "getter":
            case "setter":
            case "property":
            case "constructor":
                if (
                    parent &&
                    parent.spans[0].start !== item.spans[0].start &&
                    ["type", "class", "interface"].includes(parent.kind)
                ) {
                    types.push("reference")
                }
                break
        }
    }
    return types
}

function getRangeOfNavigationTree(navtree: NavigationTree, cr: CachedCompileResultItem) {
    if (navtree.nameSpan) {
        const ss = cr.getSourceIndex(navtree.nameSpan.start)
        const se = cr.getSourceIndex(navtree.nameSpan.start + navtree.nameSpan.length, true)
        if (isSourceIndexesInvalid(ss, se)) {
            return undefined
        }
        return cr.getRange(ss, se)
    }

    const span = navtree.spans[0]
    if (!span) {
        return undefined
    }

    const ss = cr.getSourceIndex(span.start)
    const se = cr.getSourceIndex(span.start + span.length, true)
    if (isSourceIndexesInvalid(ss, se)) {
        return undefined
    }

    const text = cr.inputDescriptor.source.slice(ss, se)
    const match = new RegExp(
        `^(.*?(?:\\b|\\W))${escapeRegExp(navtree.text || "")}(?:\\b|\\W)`,
        "gm"
    ).exec(text)
    const prefixLength = match ? match.index + match[1].length : 0
    return cr.getRange(ss + prefixLength, se + prefixLength)
}
