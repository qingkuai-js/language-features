import type { ConfigureFileParams } from "../../../../../types/communication"

import nodePath from "node:path"

import { setQingkuaiConfig } from "./method"
import { tsPluginIpcServer, ts, adapter } from "../../state"
import { TP_HANDLERS } from "../../../../../shared-util/constant"

export function attachChangeConfig() {
    // 添加 typescript 的客户端配置选项到 qingkuai 文件的 ScriptInfo
    tsPluginIpcServer.onNotification(TP_HANDLERS.ConfigureFile, (params: ConfigureFileParams) => {
        const filePath = adapter.getNormalizedPath(params.fileName)
        convertImportFileExcludePatternsPreferences(
            params.typescriptConfig.preference.autoImportFileExcludePatterns!,
            params.dirPath
        )
        adapter.projectService.setHostConfiguration({
            file: filePath,
            preferences: params.typescriptConfig.preference,
            formatOptions: params.typescriptConfig.formatCodeSettings
        })
        setQingkuaiConfig(filePath, {
            resolveImportExtension: params.qingkuaiConfig.resolveImportExtension,
            hoverTipReactiveStatus: params.extensionConfig.hoverTipReactiveStatus
        })
    })
}

// typescript 版本低于 5.4.0 时 autoImportFileExcludePatterns 配置项
// 不支持以通配符开头，将以通配符开头或为相对路径的pattern转换为绝对路径
function convertImportFileExcludePatternsPreferences(
    patterns: string[] | undefined,
    dirPath: string
) {
    patterns?.forEach((p, i) => {
        let wildcardPrefix = ""
        if (ts.version < "5.4.0") {
            wildcardPrefix = nodePath.parse(dirPath).root
        }
        if (nodePath.isAbsolute(p)) {
            return
        }
        if (p.startsWith("*")) {
            patterns[i] = wildcardPrefix + p
        } else if (/^\.\.?($|[\/\\])/.test(p)) {
            patterns[i] = nodePath.join(dirPath, p)
        } else {
            return wildcardPrefix + "**" + nodePath.sep + p
        }
    })
}
