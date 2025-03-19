import type TS from "typescript"

export enum RefreshDiagnosticKind {
    fileSystem = "///fs",
    qingkuaiConfig = "///qk",
    typescriptConfig = "///ts"
}

export const ORI_SOURCE_FILE: unique symbol = Symbol()
export const HAS_BEEN_PROXIED_BY_QINGKUAI: unique symbol = Symbol()

export const DEFAULT_PROTOCOL_LOCATION: TS.server.protocol.Location = {
    line: 1,
    offset: 1
}

export const COMPILER_FUNCS = new Set(["rea", "der", "stc", "wat", "Wat", "waT"])

export const SCRIPT_EXTENSIONS = [".d.ts", ".ts", ".tsx", ".js", ".jsx", ".json"]
