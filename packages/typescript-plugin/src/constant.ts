import type TS from "typescript"
import { generateCustomPathByNodePath } from "../../../shared-util/sundry"

export enum RefreshDiagnosticKind {
    fileSystem = "///fs",
    qingkuaiConfig = "///qk",
    typescriptConfig = "///ts"
}

export const CUSTOM_PATH = generateCustomPathByNodePath()
export const HAS_BEEN_PROXIED_BY_QINGKUAI: unique symbol = Symbol()
export const DEFAULT_PROTOCOL_LOCATION: TS.server.protocol.Location = { line: 1, offset: 1 }
