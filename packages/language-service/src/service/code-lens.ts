import type {
    CodeLensData,
    CodeLensConfig,
    GetScriptNavTreeFunc,
    resolveScriptCodeLensFunc,
    GetCompileResultFunc,
    GetCodeLensConfigFunc
} from "../types/service"
import type TS from "typescript"
import type { CodeLens, Location } from "vscode-languageserver-types"
import type { CompileResult, CustomPath } from "../../../../types/common"
import type { ShowReferencesCommandParams } from "../../../../types/command"

import { URI } from "vscode-uri"
import { walk } from "../util/qingkuai"
import { findSlotReferences } from "./reference"
import { escapeRegExp } from "../../../../shared-util/sundry"
import { EXPORT_DEFAULT_OFFSET } from "../../../../shared-util/constant"
import { filePathToComponentName, isIndexesInvalid } from "../../../../shared-util/qingkuai"

export async function codeLens(
    cr: CompileResult,
    path: CustomPath,
    getScriptNavTree: GetScriptNavTreeFunc,
    getCodeLensConfig: GetCodeLensConfigFunc
): Promise<CodeLens[] | null> {
    const e29x = cr.interIndexMap.itos.length + EXPORT_DEFAULT_OFFSET
    const additionCodeLensConfig = cr.config.extensionConfig?.additionalCodeLens
    const navtree = await getScriptNavTree(cr.filePath)
    if (!navtree?.childItems) {
        return null
    }

    const codeLensConfig = await getCodeLensConfig(cr.uri, cr.scriptLanguageId)
    if (
        !codeLensConfig.referencesCodeLens.enabled &&
        !codeLensConfig.implementationsCodeLens?.enabled
    ) {
        return null
    }

    const codeLenses: CodeLens[] = []
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
                            interIndex: cr.getInterIndex(cr.getOffset(range.start))
                        } satisfies CodeLensData
                    })
                })
            }
        }
    })

    // 在嵌入script标签和slot标签处添加代码镜头（引用）
    if (additionCodeLensConfig?.length) {
        walk(cr.templateNodes, node => {
            const tagNameEndIndex = node.range[0] + node.tag.length + 1
            if (
                node.isEmbedded &&
                /[jt]s$/.test(node.tag) &&
                additionCodeLensConfig.includes("component")
            ) {
                codeLenses.push({
                    range: cr.getRange(node.range[0], tagNameEndIndex),
                    data: {
                        interIndex: e29x,
                        type: "reference",
                        fileName: cr.filePath,
                        position: cr.getPosition(node.range[0])
                    } satisfies CodeLensData
                })
            } else if (additionCodeLensConfig.includes("slot") && node.tag === "slot") {
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
                            componentName: filePathToComponentName(path, cr.filePath),
                            position: cr.getPosition(nameAttribute.key.loc.start.index)
                        } satisfies CodeLensData
                    })
                }
            }
        })
    }

    return codeLenses
}

export async function resolveCodeLens(
    codeLens: CodeLens,
    getCompileRes: GetCompileResultFunc,
    findCodeLens: resolveScriptCodeLensFunc
): Promise<CodeLens> {
    const data: CodeLensData = codeLens.data
    const { type, fileName, interIndex, position, componentName } = data

    const locations: Location[] = []
    const label = componentName ? "useage" : type
    let findResult = await findCodeLens(fileName, interIndex, type)

    // 过滤实现中与现实codeLens开始位置相同的项目
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
        if (!componentName) {
            findResult.forEach(item => {
                locations.push({
                    range: item.range,
                    uri: URI.file(item.fileName).toString()
                })
            })
        } else {
            const useages = await findSlotReferences(
                findResult,
                getCompileRes,
                data.slotName!,
                componentName
            )
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
    items: TS.NavigationTree[],
    parent: TS.NavigationTree | undefined,
    cb: (item: TS.NavigationTree, parent: TS.NavigationTree | undefined) => void
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
    item: TS.NavigationTree,
    parent: TS.NavigationTree | undefined
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

function getRangeOfNavigationTree(navtree: TS.NavigationTree, cr: CompileResult) {
    if (navtree.nameSpan) {
        const ss = cr.getSourceIndex(navtree.nameSpan.start)
        const se = cr.getSourceIndex(navtree.nameSpan.start + navtree.nameSpan.length, true)
        if (isIndexesInvalid(ss, se)) {
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
    if (isIndexesInvalid(ss, se)) {
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
