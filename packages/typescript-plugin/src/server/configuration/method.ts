import type {
    RealPath,
    QingkuaiConfiguration,
    QingkuaiConfigurationWithDir
} from "../../../../../types/common"

import path from "node:path"
import { isUndefined } from "../../../../../shared-util/assert"
import { DEFAULT_QINGKUAI_CONFIGURATION } from "../../../../../shared-util/constant"

// .qingkuairc文件配置内容，键为其所在的目录
const configurations = new Map<RealPath, QingkuaiConfiguration>()

export function getQingkuaiConfig(k: RealPath) {
    return getConfigByFileName(k)
}

export function deleteQingkuaiConfig(k: RealPath) {
    configurations.delete(k)
}

export function setQingkuaiConfig(k: RealPath, v: QingkuaiConfiguration) {
    configurations.set(k, v)
}

export function initQingkuaiConfig(configs: QingkuaiConfigurationWithDir[]) {
    configs.forEach(item => {
        configurations.set(item.dir, item)
    })
}

// 根据文件路径查找影响它的配置文件
export function getConfigByFileName(realPath: RealPath): QingkuaiConfiguration {
    let currentDirname = path.dirname(realPath)
    while (currentDirname !== path.parse(currentDirname).root) {
        const configuration = configurations.get(currentDirname as RealPath)
        if (!isUndefined(configuration)) {
            return configuration
        } else {
            currentDirname = path.dirname(currentDirname)
        }
    }
    return DEFAULT_QINGKUAI_CONFIGURATION
}
