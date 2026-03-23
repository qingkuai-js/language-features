import type { CompileResult } from "../../../../types/common"
import type { LanguageService } from "vscode-css-languageservice"

import {
    TextDocument,
    getCSSLanguageService,
    getLESSLanguageService,
    getSCSSLanguageService
} from "vscode-css-languageservice"
import { debugAssert } from "../../../../shared-util/assert"

export function walkStyleSheet(node: any, cb: (node: any) => void) {
    ;(cb(node), node.children?.forEach((c: any) => walkStyleSheet(c, cb)))
}

export function findStyleSheetNodeAt(node: any, index: number): any {
    if (index < node.offset || index > node.end) {
        return null
    }
    if (node.children) {
        for (const child of node.children) {
            const found = findStyleSheetNodeAt(child, index)
            if (found) {
                return found
            }
        }
    }
    return node
}

// 通过通用参数（[TextDocument, Position, StyleSheet]）执行css-languageservice的方法
export function excuteCssCommonHandler<
    H extends "prepareRename" | "findDefinition" | "findReferences"
>(handler: H, cr: CompileResult, offset: number) {
    const [languageService, ...params] = createStyleSheetAndDocument(cr, offset)!
    return languageService[handler](...params!) as any as ReturnType<LanguageService[H]>
}

// 根据style block的内容选择LanguageService并创建TextDocument和StyleSheet
// 注意：此方法创建的textDocument会将style块内容开始前的行以空行填充，列以空格填充
export function createStyleSheetAndDocument(entry: CompileResult, offset: number) {
    const styleDescriptor = entry.styleDescriptors.find(item => {
        return offset >= item.loc.start.index && offset <= item.loc.end.index
    })!
    debugAssert(styleDescriptor)

    let languageService: LanguageService
    let languageId = styleDescriptor.lang
    switch (styleDescriptor.lang) {
        case "scss":
        case "sass":
            languageService = getSCSSLanguageService()
            break
        case "less":
            languageService = getLESSLanguageService()
            break
        default: {
            languageId = "css"
            languageService = getCSSLanguageService()
        }
    }

    const preLine = "\n".repeat(styleDescriptor.loc.start.line - 1)
    const preColumn = " ".repeat(styleDescriptor.loc.start.column)
    const content = preLine + preColumn + styleDescriptor.code
    const document = TextDocument.create(entry.uri, languageId, 1, content)
    const styleSheet = languageService.parseStylesheet(document)
    return [languageService, document, entry.document.positionAt(offset), styleSheet] as const
}
