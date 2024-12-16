import { QingkuaiConfiguration, QingkuaiConfigurationWithDir } from "../../../../types/common"

import path from "path"
import { configurations, server } from "../state"
import { refreshDiagnostics } from "./diagnostic/refresh"
import { isUndefined } from "../../../../shared-util/assert"

export function attachChangeConfig() {
    const refreshDiagnosticsDelay = () => {
        setTimeout(() => {
            refreshDiagnostics("///qk", false)
        }, 1000)
    }

    server.onNotification("deleteConfig", (dir: string) => {
        refreshDiagnosticsDelay()
        configurations.delete(dir)
    })

    server.onNotification("updateConfig", (config: QingkuaiConfigurationWithDir) => {
        refreshDiagnosticsDelay()
        configurations.set(config.dir, config)
    })
}

// 根据文件路径查找影响它的配置文件
export function getConfigByFileName(fileName: string): QingkuaiConfiguration {
    let currentDirname = path.dirname(fileName)
    while (currentDirname !== path.parse(currentDirname).root) {
        const configuration = configurations.get(currentDirname)
        if (!isUndefined(configuration)) {
            return configuration
        } else {
            currentDirname = path.dirname(currentDirname)
        }
    }
    return {}
}
