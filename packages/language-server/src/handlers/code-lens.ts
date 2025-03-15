import {
    FindReferenceResultItem,
    TPICCommonRequestParams,
    type GetConfigurationParams
} from "../../../../types/communication"
import type { NavigationTree } from "typescript"
import type { CodeLens, Location } from "vscode-languageserver"
import type { CachedCompileResultItem, CodeLensConfig } from "../types/service"
import type { CodeLensHandler, ResolveCodeLensHandler } from "../types/handlers"

import { getCompileRes } from "../compile"
import { connection, documents, tpic } from "../state"
import { escapeRegExp } from "../../../../shared-util/sundry"
import { isSourceIndexesInvalid } from "../../../../shared-util/qingkuai"
import { ShowReferencesCommandParams } from "../../../../types/command"

export const codeLens: CodeLensHandler = async ({ textDocument }) => {
    const document = documents.get(textDocument.uri)
    if (!document) {
        return null
    }

    const cr = await getCompileRes(document)
    const navtree = await tpic.sendRequest<string, NavigationTree | undefined>(
        "getNavigationTree",
        cr.filePath
    )
    if (!navtree?.childItems) {
        return null
    }

    const codeLenses: CodeLens[] = []
    const codeLensConfig: CodeLensConfig = await connection.sendRequest(
        "qingkuai/getConfiguration",
        {
            uri: textDocument.uri,
            section: cr.scriptLanguageId,
            filter: ["referencesCodeLens", "implementationsCodeLens"]
        } satisfies GetConfigurationParams
    )
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
                            interIndex: cr.interIndexMap.stoi[document.offsetAt(range.start)]
                        }
                    })
                })
            }
        }
    })
    return codeLenses
}

export const resolveCodeLens: ResolveCodeLensHandler = async codeLens => {
    const locations: Location[] = []
    const fileName: string = codeLens.data.fileName
    const interIndex: number = codeLens.data.interIndex
    const type: "reference" | "implementation" = codeLens.data.type
    if (type === "reference") {
        const references: FindReferenceResultItem[] | null =
            await tpic.sendRequest<TPICCommonRequestParams>("findReference", {
                fileName,
                pos: interIndex
            })
        references?.forEach(item => {
            locations.push({
                range: item.range,
                uri: `file://${item.fileName}`
            })
        })
        codeLens.command = {
            command: locations.length ? "qingkuai.showReferences" : "",
            title: `${locations.length} reference${locations.length === 1 ? "" : "s"}`,
            arguments: [
                {
                    fileName,
                    locations,
                    position: codeLens.data.position
                } satisfies ShowReferencesCommandParams
            ]
        }
    }
    return codeLens
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
            config.implementationsCodeLens.enabled &&
            config.implementationsCodeLens.showOnInterfaceMethods
        ) {
            types.push("implementation")
        }
    }

    if (config.implementationsCodeLens.enabled && !types.includes("implementation")) {
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
