import type { TsNormalizedPath, TsPluginQingkuaiConfig } from "../../../../../types/common"

import { adapter, ts } from "../../state"

const configurations = new Map<TsNormalizedPath, TsPluginQingkuaiConfig>()

export function getQingkuaiConfig(fileName: string): TsPluginQingkuaiConfig {
    const found = configurations.get(adapter.getNormalizedPath(fileName))
    if (!found) {
        return {
            resolveImportExtension: true,
            hoverTipReactiveStatus: true
        }
    }
    return found
}

export function deleteQingkuaiConfig(fileName: string) {
    configurations.delete(ts.server.toNormalizedPath(fileName))
}

export function setQingkuaiConfig(fileName: string, config: TsPluginQingkuaiConfig) {
    configurations.set(adapter.getNormalizedPath(fileName), config)
}
