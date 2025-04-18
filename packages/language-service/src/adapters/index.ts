import type { CreateLsAdaptersOptions } from "../types/service"

import { createLsAdapter } from "./state"

export * as astUtil from "./ts-ast"
export * as proxies from "./proxies"
export * as convertor from "./convert"
export * as qkContext from "./qingkuai"

export const init = (options: CreateLsAdaptersOptions) => {
    createLsAdapter(options)
}

export { resolvedQingkuaiModule, typeDeclarationFilePath } from "./state"
export { getCompileInfo, typeRefStatement, qingkuaiDiagnostics } from "./state"
