import type { CachedCompileResultItem } from "../types/service"
import type { LanguageService } from "vscode-css-languageservice"

import { cssLanguageService } from "../state"
import { createStyleSheetAndDocument } from "./qingkuai"

// 通过通用参数（[TextDocument, Position, StyleSheet]）执行css-languageservice的方法
export function excuteCSSLSHandler<H extends "prepareRename" | "findDefinition" | "findReferences">(
    handler: H,
    cr: CachedCompileResultItem,
    offset: number
) {
    return cssLanguageService[handler](
        ...createStyleSheetAndDocument(cr, offset)!
    ) as any as ReturnType<LanguageService[H]>
}
