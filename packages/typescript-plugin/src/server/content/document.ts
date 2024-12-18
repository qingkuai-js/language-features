import type { QingKuaiFileInfo } from "../../types"

import { existsSync } from "fs"
import { project, projectService, ts } from "../../state"
import { isUndefined } from "../../../../../shared-util/assert"
import { createRandomHash } from "../../../../../shared-util/sundry"

const reverseMap = new Map<string, string>()
const mappedQkFiles = new Map<string, QingKuaiFileInfo>()

// 获取打开状态的映射文件信息列表
export function getOpenQkFileInfos() {
    const fileInfos: QingKuaiFileInfo[] = []
    mappedQkFiles.forEach(info => {
        if (info.isOpen) {
            fileInfos.push(info)
        }
    })
    return fileInfos
}

// 判断文件名称是否是映射后的文件名称
export function isMappingFileName(fileName: string) {
    return reverseMap.has(fileName)
}

// 通过原始文件名称换取映射文件名称
export function getMappingFileName(fileName: string) {
    return mappedQkFiles.get(fileName)?.mappingFileName
}

// 通过原始/映射文件名称获取映射文件信息
export function getMappingFileInfo(fileName: string) {
    if (isMappingFileName(fileName)) {
        fileName = getRealName(fileName)!
    }
    return mappedQkFiles.get(fileName)
}

// 通过映射文件名称换取原始文件名称
export function getRealName(mappingFileName: string) {
    return reverseMap.get(mappingFileName)
}

// 获取已被映射的qk文件的映射文件信息列表
export function getMappedQkFiles() {
    return Array.from(mappedQkFiles).map(([_, info]) => {
        return info.mappingFileName
    })
}

// 为.qk文件分配一个映射文件信息，如果它已经存在，则只修改它的打开状态
export function assignMappingFileForQkFile(
    fileName: string,
    isOpen: boolean,
    properties: Partial<QingKuaiFileInfo> = {}
) {
    let mappingFileName = getMappingFileName(fileName)
    if (isUndefined(mappingFileName)) {
        do {
            mappingFileName = `${fileName}.${createRandomHash(12)}.ts`
        } while (existsSync(mappingFileName) || reverseMap.has(mappingFileName))

        mappedQkFiles.set(fileName, {
            isOpen,
            itos: [],
            offset: 0,
            version: 0,
            slotInfo: {},
            interCode: "",
            mappingFileName,
            scriptKind: ts.ScriptKind.JS,
            getPos(pos: number) {
                if (!pos) {
                    return 0
                }
                return pos - this.offset
            },
            ...properties
        })
        reverseMap.set(mappingFileName, fileName)
    }

    const ret = getMappingFileInfo(fileName)!
    return (ret.isOpen = isOpen), ret
}

export function ensureFileOpenStatus({ isOpen, mappingFileName }: QingKuaiFileInfo) {
    // @ts-expect-error: access private property
    const { openFiles, filenameToScriptInfo } = projectService
    const p = projectService.toPath(mappingFileName)
    if (openFiles.has(p) && !isOpen) {
        openFiles.delete(p)
        filenameToScriptInfo.delete(p)
    } else if (!openFiles.has(p) && isOpen) {
        filenameToScriptInfo.set(p, projectService.getScriptInfo(mappingFileName))
        openFiles.set(p, ts.server.toNormalizedPath(project.getCurrentDirectory()))
    }
}
