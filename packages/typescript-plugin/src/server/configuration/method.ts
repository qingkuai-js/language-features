import path from "path"
import { isUndefined } from "../../../../../shared-util/assert"
import { QingkuaiConfiguration, QingkuaiConfigurationWithDir } from "../../../../../types/common"

// .qingkuairc文件配置内容，键为其所在的目录
const configurations = new Map<string, QingkuaiConfiguration>()

export function getQingkuaiConfig(k: string) {
    return configurations.get(k)
}

export function deleteQingkuaiConfig(k: string) {
    configurations.delete(k)
}

export function setQingkuaiConfig(k: string, v: QingkuaiConfiguration) {
    configurations.set(k, v)
}

export function initQingkuaiConfig(configs: QingkuaiConfigurationWithDir[]) {
    configs.forEach(item => {
        configurations.set(item.dir, item)
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
