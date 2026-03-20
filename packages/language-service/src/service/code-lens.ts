import type {
    CodeLensData,
    CodeLensConfig,
    GetScriptNavTreeFunc,
    GetCodeLensConfigFunc,
    DoResolveCodeLensFunc
} from "../types/service"
import type TS from "typescript"
import type { CompileResult } from "../../../../types/common"
import type { QingkuaiCommandTypes } from "../../../../types/command"
import type { CodeLens, Location, Range } from "vscode-languageserver-types"

import { URI } from "vscode-uri"
import { escapeRegExp } from "../../../../shared-util/sundry"
import { isIndexesInvalid } from "../../../../shared-util/qingkuai"

export async function getCodeLens(
    cr: CompileResult,
    getScriptNavTree: GetScriptNavTreeFunc,
    getCodeLensConfig: GetCodeLensConfigFunc
): Promise<CodeLens[] | null> {
    const tsNavigationTree = await getScriptNavTree(cr.filePath)
    if (!tsNavigationTree?.childItems?.length) {
        return null
    }

    const codeLenses: CodeLens[] = []
    const codeLensConfig = await getCodeLensConfig(cr.uri, cr.scriptLanguageId)
    ;(function walkTsNavigationTree(navigation: TS.NavigationTree, parent?: TS.NavigationTree) {
        getCodeLensTypesForNavigationTree(codeLensConfig, navigation, parent).forEach(type => {
            const range = getVscodeRangeOfTsNavigationTree(navigation, cr)
            if (range) {
                codeLenses.push({
                    range,
                    data: {
                        type,
                        fileName: cr.filePath,
                        position: range.start,
                        interIndex: cr.getInterIndex(cr.document.offsetAt(range.start))
                    } satisfies CodeLensData
                })
            }
        })
        navigation.childItems?.forEach(child => walkTsNavigationTree(child, navigation))
    })(tsNavigationTree)

    if (
        cr.scriptDescriptor.existing &&
        cr.config?.extensionConfig.additionalCodeLens.includes("component")
    ) {
        const range = cr.getVscodeRange(...cr.scriptDescriptor.startTagOpenRange)
        codeLenses.push({
            range,
            data: {
                type: "reference",
                fileName: cr.filePath,
                position: range.start,
                interIndex: cr.getInterIndex(cr.scriptDescriptor.startTagOpenRange[0] + 1)
            } satisfies CodeLensData
        })
    }

    if (cr.config?.extensionConfig.additionalCodeLens.includes("slot")) {
        for (const name of cr.slotNames) {
            let range: Range
            const slotNode = cr.getSlotTemplateNode(name)!
            const slotNodeContext = cr.getTemplateNodeContext(slotNode)
            if (!slotNodeContext.attributesMap.name) {
                range = cr.getVscodeRange(
                    slotNode.loc.start.index + 1,
                    slotNode.loc.start.index + 5
                )
            } else {
                range = cr.getVscodeRange(slotNodeContext.attributesMap.name.loc)
            }
            codeLenses.push({
                range,
                data: {
                    type: "assignment",
                    fileName: cr.filePath,
                    position: range.start,
                    interIndex: cr.getInterIndex(cr.document.offsetAt(range.start))
                } satisfies CodeLensData
            })
        }
    }

    return codeLenses
}

export async function resolveCodeLens(
    codeLens: CodeLens,
    doResolveCodeLens: DoResolveCodeLensFunc
): Promise<CodeLens> {
    const data: CodeLensData = codeLens.data

    const locations: Location[] = []
    let findResult = await doResolveCodeLens(
        data.fileName,
        data.interIndex,
        data.type === "implementation" ? "implementation" : "reference"
    )

    findResult?.forEach(item => {
        // 过滤掉与当前位置相同的项目
        if (
            item.fileName !== data.fileName ||
            item.range.start.line !== data.position.line ||
            item.range.start.character !== data.position.character
        ) {
            locations.push({
                range: item.range,
                uri: URI.file(item.fileName).toString()
            })
        }
    })

    return {
        command: {
            arguments: [
                {
                    locations,
                    fileName: data.fileName,
                    position: data.position
                } satisfies QingkuaiCommandTypes.ShowReferencesParams
            ],
            command: locations.length ? "qingkuai.showReferences" : "",
            title: `${locations.length} ${data.type}${locations.length === 1 ? "" : "s"}`
        },
        ...codeLens
    }
}

function getCodeLensTypesForNavigationTree(
    config: CodeLensConfig,
    item: TS.NavigationTree,
    parent: TS.NavigationTree | undefined
) {
    const types: ("implementation" | "reference")[] = []

    // implementations
    ;(function () {
        if (!config.implementationsCodeLens?.enabled) {
            return
        }

        if (
            "method" === item.kind &&
            "interface" === parent?.kind &&
            config.implementationsCodeLens?.showOnInterfaceMethods
        ) {
            return types.push("implementation")
        }

        switch (item.kind) {
            case "interface": {
                types.push("implementation")
                break
            }
            case "class":
            case "method":
            case "getter":
            case "setter":
            case "property": {
                if (item.kindModifiers.match(/\babstract\b/g)) {
                    types.push("implementation")
                }
                break
            }
        }
    })()

    // references
    ;(function () {
        if (!config.referencesCodeLens?.enabled) {
            return
        }

        if ("enum" === parent?.kind) {
            return types.push("reference")
        }

        switch (item.kind) {
            case "function": {
                if (config.referencesCodeLens.showOnAllFunctions && item.nameSpan) {
                    return types.push("reference")
                }
                break
            }

            // 导出语句会导致错误，不添加代码镜头
            // case "var":
            // case "let":
            // case "const": {
            //     if (/\bexport\b/.test(item.kindModifiers)) {
            //         types.push("reference")
            //     }
            //     break
            // }

            case "class": {
                if (item.text !== "<class>") {
                    types.push("reference")
                }
                break
            }

            case "type":
            case "enum":
            case "interface": {
                types.push("reference")
                break
            }

            case "method":
            case "getter":
            case "setter":
            case "property":
            case "constructor": {
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
    })()

    return types
}

function getVscodeRangeOfTsNavigationTree(navtree: TS.NavigationTree, cr: CompileResult) {
    if (navtree.nameSpan) {
        const nameSourceStart = cr.getSourceIndex(navtree.nameSpan.start)
        const nameSourceEnd = cr.getSourceIndex(navtree.nameSpan.start + navtree.nameSpan.length)
        if (isIndexesInvalid(nameSourceStart, nameSourceEnd)) {
            return undefined
        }
        return cr.getVscodeRange(nameSourceStart, nameSourceEnd)
    }

    const span = navtree.spans[0]
    if (!span) {
        return undefined
    }

    const sourceStart = cr.getSourceIndex(span.start)
    const sourceEnd = cr.getSourceIndex(span.start + span.length)
    if (
        isIndexesInvalid(sourceStart, sourceEnd) ||
        sourceEnd > cr.scriptDescriptor.loc.end.index ||
        sourceEnd < cr.scriptDescriptor.loc.start.index
    ) {
        return undefined
    }

    const text = cr.document.getText().slice(sourceStart, sourceEnd)
    const match = new RegExp(
        `^(.*?(?:\\b|\\W))${escapeRegExp(navtree.text || "")}(?:\\b|\\W)`,
        "gm"
    ).exec(text)
    const prefixLength = match ? match.index + match[1].length : 0
    return cr.getVscodeRange(sourceStart + prefixLength, sourceEnd + prefixLength)
}
