import type { CompileResult } from "../../../../types/common"
import type { LanguageService } from "vscode-css-languageservice"

import { toLSPosition } from "../../../../shared-util/qingkuai"
import { getCSSLanguageService, TextDocument } from "vscode-css-languageservice"

export const cssLanguageService = getCSSLanguageService()

// 通过通用参数（[TextDocument, Position, StyleSheet]）执行css-languageservice的方法
export function excuteCssCommonHandler<
    H extends "prepareRename" | "findDefinition" | "findReferences"
>(handler: H, cr: CompileResult, offset: number) {
    return cssLanguageService[handler](
        ...createStyleSheetAndDocument(cr, offset)!
    ) as any as ReturnType<LanguageService[H]>
}

// 根据style block的内容创建TextDocument和StyleSheet
// 注意：此方法创建的textDocument会将style块内容开始前的行以空行填充，列以空格填充
export function createStyleSheetAndDocument(cr: CompileResult, offset: number) {
    const styleDescriptor = cr.inputDescriptor.styles.find(item => {
        return offset >= item.loc.start.index && offset <= item.loc.end.index
    })
    if (!styleDescriptor) {
        return null
    }

    let languageId = styleDescriptor.lang
    if (!/(?:css|s[ca]ss|less)/.test(languageId)) {
        languageId = "css"
    }

    const preLine = "\n".repeat(styleDescriptor.loc.start.line - 1)
    const preColumn = " ".repeat(styleDescriptor.loc.start.column)
    const content = preLine + preColumn + styleDescriptor.code
    const document = TextDocument.create(cr.uri, languageId, 1, content)
    const styleSheet = cssLanguageService.parseStylesheet(document)
    return [document, toLSPosition(cr.inputDescriptor.positions[offset]), styleSheet] as const
}
