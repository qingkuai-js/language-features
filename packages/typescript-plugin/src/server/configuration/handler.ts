import type {
    QingkuaiConfiguration,
    QingkuaiConfigurationWithDir
} from "../../../../../types/common"
import type { ConfigureFileParams } from "../../../../../types/communication"

import path from "path"
import { relativePathRE } from "../../regular"
import { projectService, server, ts } from "../../state"
import { getMappingFileName } from "../content/document"
import { refreshDiagnostics } from "../diagnostic/refresh"
import { isUndefined } from "../../../../../shared-util/assert"
import { deleteQingkuaiConfig, getQingkuaiConfig, setQingkuaiConfig } from "./method"

export function attachChangeConfig() {
    server.onNotification("deleteConfig", (dir: string) => {
        refreshDiagnosticsDelay()
        deleteQingkuaiConfig(dir)
    })

    server.onNotification("updateConfig", (config: QingkuaiConfigurationWithDir) => {
        refreshDiagnosticsDelay()
        setQingkuaiConfig(config.dir, config)
    })

    // 此方法用于将typescript相关的配置项与文件关联，qk文件不会经过ts的客户端扩展处理需要手动添加配置信息
    server.onNotification("configureFile", (params: ConfigureFileParams) => {
        const mappingFileName = getMappingFileName(params.fileName)
        convertImportFileExcludePatternsPreferences(
            params.config.preference.autoImportFileExcludePatterns!,
            params.workspacePath
        )
        projectService.setHostConfiguration({
            file: mappingFileName,
            preferences: params.config.preference,
            formatOptions: params.config.formatCodeSettings
        })
    })
}

// 根据文件路径查找影响它的配置文件
export function getConfigByFileName(fileName: string): QingkuaiConfiguration {
    let currentDirname = path.dirname(fileName)
    while (currentDirname !== path.parse(currentDirname).root) {
        const configuration = getQingkuaiConfig(currentDirname)
        if (!isUndefined(configuration)) {
            return configuration
        } else {
            currentDirname = path.dirname(currentDirname)
        }
    }
    return {}
}

function refreshDiagnosticsDelay() {
    setTimeout(() => refreshDiagnostics("///qk", false), 1000)
}

// typescript版本低于5.4.0时autoImportFileExcludePatterns配置项
// 不支持以通配符开头，将以通配符开头或为相对路径的pattern转换为绝对路径
function convertImportFileExcludePatternsPreferences(
    patterns: string[] | undefined,
    workspacePath: string
) {
    patterns?.forEach((p, i) => {
        let wildcardPrefix = ""
        if (ts.version < "5.4.0") {
            wildcardPrefix = path.parse(workspacePath).root
        }
        if (path.isAbsolute(p)) {
            return
        }
        if (p.startsWith("*")) {
            patterns[i] = wildcardPrefix + p
        } else if (relativePathRE.test(p)) {
            patterns[i] = path.join(workspacePath, p)
        } else {
            return wildcardPrefix + "**" + path.sep + p
        }
    })
}
