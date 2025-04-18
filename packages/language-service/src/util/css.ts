import type { CompileResult } from "../../../../types/common"
import type { LanguageService } from "vscode-css-languageservice"

import {
    TextDocument,
    getCSSLanguageService,
    getLESSLanguageService,
    getSCSSLanguageService
} from "vscode-css-languageservice"
import { debugAssert } from "../../../../shared-util/assert"
import { toLSPosition } from "../../../../shared-util/qingkuai"

export function walk(node: any, cb: (node: any) => void) {
    cb(node), node.children?.forEach((c: any) => walk(c, cb))
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
export function createStyleSheetAndDocument(cr: CompileResult, offset: number) {
    const styleDescriptor = cr.inputDescriptor.styles.find(item => {
        return offset >= item.loc.start.index && offset <= item.loc.end.index
    })!
    debugAssert(!!styleDescriptor)

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
    const document = TextDocument.create(cr.uri, languageId, 1, content)
    const styleSheet = languageService.parseStylesheet(document)
    const lsPosition = toLSPosition(cr.inputDescriptor.positions[offset])
    return [languageService, document, lsPosition, styleSheet] as const
}
